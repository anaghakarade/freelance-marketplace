package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"
	"workstream-backend/internal/database"
	"workstream-backend/internal/models"
)

var (
	ErrConversationNotFound = errors.New("conversation not found")
	ErrNotParticipant       = errors.New("not a conversation participant")
)

type CommunicationRepository interface {
	CreateNotification(context.Context, *models.Notification) error
	Notifications(context.Context, string, int, bool) ([]models.Notification, int, error)
	MarkNotificationRead(context.Context, string, string) error
	MarkAllRead(context.Context, string) error
	CreateOrGetConversation(context.Context, string, string, string, string) (*models.Conversation, error)
	Conversations(context.Context, string) ([]models.Conversation, error)
	Conversation(context.Context, string, string) (*models.Conversation, error)
	Messages(context.Context, string, string, int) ([]models.Message, error)
	SendMessage(context.Context, *models.Message) error
	MarkConversationRead(context.Context, string, string) error
	RecordActivity(context.Context, *models.ActivityEvent) error
	Activity(context.Context, string, string, int) ([]models.ActivityEvent, error)
}
type communicationRepository struct{ db *database.DBWrapper }

func NewCommunicationRepository(db *database.DBWrapper) CommunicationRepository {
	return &communicationRepository{db}
}
func (r *communicationRepository) available() error {
	if r.db == nil || r.db.DB == nil {
		return ErrDatabaseUnavailable
	}
	return nil
}
func (r *communicationRepository) CreateNotification(c context.Context, n *models.Notification) error {
	if e := r.available(); e != nil {
		return e
	}
	_, e := r.db.ExecContext(c, `INSERT INTO notifications(id,user_id,type,title,message,entity_type,entity_id) VALUES($1,$2,$3,$4,$5,$6,$7)`, n.ID, n.UserID, n.Type, n.Title, n.Message, n.EntityType, n.EntityID)
	return e
}
func (r *communicationRepository) Notifications(c context.Context, u string, limit int, unread bool) ([]models.Notification, int, error) {
	if e := r.available(); e != nil {
		return nil, 0, e
	}
	var count int
	if e := r.db.QueryRowContext(c, `SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND NOT is_read`, u).Scan(&count); e != nil {
		return nil, 0, e
	}
	q := `SELECT id,user_id,type,title,message,entity_type,entity_id,is_read,created_at FROM notifications WHERE user_id=$1`
	args := []interface{}{u}
	if unread {
		q += ` AND NOT is_read`
	}
	q += ` ORDER BY created_at DESC LIMIT $2`
	args = append(args, limit)
	rows, e := r.db.QueryContext(c, q, args...)
	if e != nil {
		return nil, 0, e
	}
	defer rows.Close()
	out := []models.Notification{}
	for rows.Next() {
		var n models.Notification
		if e = rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message, &n.EntityType, &n.EntityID, &n.IsRead, &n.CreatedAt); e != nil {
			return nil, 0, e
		}
		out = append(out, n)
	}
	return out, count, rows.Err()
}
func (r *communicationRepository) MarkNotificationRead(c context.Context, id, u string) error {
	if e := r.available(); e != nil {
		return e
	}
	res, e := r.db.ExecContext(c, `UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2`, id, u)
	if e != nil {
		return e
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
func (r *communicationRepository) MarkAllRead(c context.Context, u string) error {
	if e := r.available(); e != nil {
		return e
	}
	_, e := r.db.ExecContext(c, `UPDATE notifications SET is_read=true WHERE user_id=$1 AND NOT is_read`, u)
	return e
}
func (r *communicationRepository) CreateOrGetConversation(c context.Context, id, project, buyer, freelancer string) (*models.Conversation, error) {
	if e := r.available(); e != nil {
		return nil, e
	}
	key := buyer + ":" + freelancer
	if buyer > freelancer {
		key = freelancer + ":" + buyer
	}
	tx, e := r.db.BeginTx(c, nil)
	if e != nil {
		return nil, e
	}
	defer tx.Rollback()
	var existing string
	e = tx.QueryRowContext(c, `SELECT id FROM conversations WHERE project_id=$1 AND participant_key=$2`, project, key).Scan(&existing)
	if e == nil {
		tx.Commit()
		return &models.Conversation{ID: existing, ProjectID: project}, nil
	}
	if !errors.Is(e, sql.ErrNoRows) {
		return nil, e
	}
	if _, e = tx.ExecContext(c, `INSERT INTO conversations(id,project_id,participant_key) VALUES($1,$2,$3)`, id, project, key); e != nil {
		return nil, e
	}
	for _, u := range []string{buyer, freelancer} {
		if _, e = tx.ExecContext(c, `INSERT INTO conversation_participants(conversation_id,user_id) VALUES($1,$2)`, id, u); e != nil {
			return nil, e
		}
	}
	if e = tx.Commit(); e != nil {
		return nil, e
	}
	return &models.Conversation{ID: id, ProjectID: project}, nil
}
func (r *communicationRepository) isParticipant(c context.Context, id, u string) bool {
	var x bool
	return r.db.QueryRowContext(c, `SELECT EXISTS(SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2)`, id, u).Scan(&x) == nil && x
}
func (r *communicationRepository) Conversations(c context.Context, u string) ([]models.Conversation, error) {
	if e := r.available(); e != nil {
		return nil, e
	}
	rows, e := r.db.QueryContext(c, `SELECT c.id,c.project_id,c.created_at,c.updated_at,(SELECT COUNT(*) FROM messages m WHERE m.conversation_id=c.id AND m.created_at>COALESCE(cp.last_read_at,'epoch')) FROM conversations c JOIN conversation_participants cp ON cp.conversation_id=c.id WHERE cp.user_id=$1 ORDER BY c.updated_at DESC`, u)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []models.Conversation{}
	for rows.Next() {
		var v models.Conversation
		if e = rows.Scan(&v.ID, &v.ProjectID, &v.CreatedAt, &v.UpdatedAt, &v.UnreadCount); e != nil {
			return nil, e
		}
		out = append(out, v)
	}
	return out, rows.Err()
}
func (r *communicationRepository) Conversation(c context.Context, id, u string) (*models.Conversation, error) {
	if e := r.available(); e != nil {
		return nil, e
	}
	if !r.isParticipant(c, id, u) {
		return nil, ErrNotParticipant
	}
	v := &models.Conversation{}
	if e := r.db.QueryRowContext(c, `SELECT id,project_id,created_at,updated_at FROM conversations WHERE id=$1`, id).Scan(&v.ID, &v.ProjectID, &v.CreatedAt, &v.UpdatedAt); e != nil {
		return nil, e
	}
	return v, nil
}
func (r *communicationRepository) Messages(c context.Context, id, u string, limit int) ([]models.Message, error) {
	if e := r.available(); e != nil {
		return nil, e
	}
	if !r.isParticipant(c, id, u) {
		return nil, ErrNotParticipant
	}
	rows, e := r.db.QueryContext(c, `SELECT id,conversation_id,sender_id,message,created_at,updated_at FROM messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT $2`, id, limit)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []models.Message{}
	for rows.Next() {
		var m models.Message
		if e = rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.Message, &m.CreatedAt, &m.UpdatedAt); e != nil {
			return nil, e
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
func (r *communicationRepository) SendMessage(c context.Context, m *models.Message) error {
	if e := r.available(); e != nil {
		return e
	}
	if !r.isParticipant(c, m.ConversationID, m.SenderID) {
		return ErrNotParticipant
	}
	tx, e := r.db.BeginTx(c, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	if _, e = tx.ExecContext(c, `INSERT INTO messages(id,conversation_id,sender_id,message) VALUES($1,$2,$3,$4)`, m.ID, m.ConversationID, m.SenderID, m.Message); e != nil {
		return e
	}
	_, e = tx.ExecContext(c, `UPDATE conversations SET updated_at=NOW() WHERE id=$1`, m.ConversationID)
	if e != nil {
		return e
	}
	return tx.Commit()
}
func (r *communicationRepository) MarkConversationRead(c context.Context, id, u string) error {
	if e := r.available(); e != nil {
		return e
	}
	res, e := r.db.ExecContext(c, `UPDATE conversation_participants SET last_read_at=NOW() WHERE conversation_id=$1 AND user_id=$2`, id, u)
	if e != nil {
		return e
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotParticipant
	}
	return nil
}
func (r *communicationRepository) RecordActivity(c context.Context, a *models.ActivityEvent) error {
	if e := r.available(); e != nil {
		return e
	}
	b, e := json.Marshal(a.Metadata)
	if e != nil {
		return e
	}
	_, e = r.db.ExecContext(c, `INSERT INTO activity_events(id,actor_id,entity_type,entity_id,action,description,metadata) VALUES($1,$2,$3,$4,$5,$6,$7)`, a.ID, a.ActorID, a.EntityType, a.EntityID, a.Action, a.Description, b)
	return e
}
func (r *communicationRepository) Activity(c context.Context, t, id string, limit int) ([]models.ActivityEvent, error) {
	if e := r.available(); e != nil {
		return nil, e
	}
	rows, e := r.db.QueryContext(c, `SELECT id,actor_id,entity_type,entity_id,action,description,metadata,created_at FROM activity_events WHERE entity_type=$1 AND entity_id=$2 ORDER BY created_at DESC LIMIT $3`, t, id, limit)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []models.ActivityEvent{}
	for rows.Next() {
		var a models.ActivityEvent
		var raw []byte
		if e = rows.Scan(&a.ID, &a.ActorID, &a.EntityType, &a.EntityID, &a.Action, &a.Description, &raw, &a.CreatedAt); e != nil {
			return nil, e
		}
		_ = json.Unmarshal(raw, &a.Metadata)
		out = append(out, a)
	}
	return out, rows.Err()
}

var _ = fmt.Sprintf
var _ = time.Now
