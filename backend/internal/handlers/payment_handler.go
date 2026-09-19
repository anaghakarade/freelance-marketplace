package handlers
import("errors";"net/http";"github.com/gin-gonic/gin";"workstream-backend/internal/repositories";"workstream-backend/internal/services")
type PaymentHandler struct{ service services.PaymentService }
func NewPaymentHandler(s services.PaymentService)*PaymentHandler{return &PaymentHandler{s}}
func paymentError(c *gin.Context,e error){if errors.Is(e,services.ErrForbidden){RespondError(c,403,"Forbidden");return};if errors.Is(e,repositories.ErrPaymentNotFound){RespondError(c,404,"Payment not found");return};if errors.Is(e,repositories.ErrPaymentConflict){RespondError(c,409,"Payment operation conflicts with current state");return};RespondError(c,http.StatusBadRequest,"Payment operation failed")}
func(h *PaymentHandler) Fund(c *gin.Context){p,e:=h.service.FundMilestone(c,c.Param("id"),c.GetString("user_id"),c.GetString("role"));if e!=nil{paymentError(c,e);return};RespondCreated(c,p,"Milestone funded and held in internal escrow")}
func(h *PaymentHandler) Release(c *gin.Context){e:=h.service.ReleasePayment(c,c.Param("id"),c.GetString("user_id"),c.GetString("role"));if e!=nil{paymentError(c,e);return};RespondSuccess(c,gin.H{"id":c.Param("id"),"status":"released"},"Payment released")}
func(h *PaymentHandler) Refund(c *gin.Context){e:=h.service.RefundPayment(c,c.Param("id"),c.GetString("user_id"),c.GetString("role"));if e!=nil{paymentError(c,e);return};RespondSuccess(c,gin.H{"id":c.Param("id"),"status":"refunded"},"Refund recorded")}
func(h *PaymentHandler) Get(c *gin.Context){p,e:=h.service.GetPayment(c,c.Param("id"),c.GetString("user_id"),c.GetString("role"));if e!=nil{paymentError(c,e);return};RespondSuccess(c,p)}
func(h *PaymentHandler) ByMilestone(c *gin.Context){p,e:=h.service.GetMilestonePayment(c,c.Param("id"),c.GetString("user_id"),c.GetString("role"));if e!=nil{paymentError(c,e);return};RespondSuccess(c,p)}
func(h *PaymentHandler) ByContract(c *gin.Context){p,e:=h.service.GetContractPayments(c,c.Param("id"),c.GetString("user_id"),c.GetString("role"));if e!=nil{paymentError(c,e);return};RespondSuccess(c,p)}
func(h *PaymentHandler) Mine(c *gin.Context){p,e:=h.service.GetMyPayments(c,c.GetString("user_id"));if e!=nil{paymentError(c,e);return};RespondSuccess(c,p)}
func(h *PaymentHandler) Wallet(c *gin.Context){w,e:=h.service.GetWallet(c,c.GetString("user_id"));if e!=nil{paymentError(c,e);return};RespondSuccess(c,w)}
func(h *PaymentHandler) Earnings(c *gin.Context){w,e:=h.service.GetWallet(c,c.GetString("user_id"));if e!=nil{paymentError(c,e);return};RespondSuccess(c,w)}
func(h *PaymentHandler) Ledger(c *gin.Context){x,e:=h.service.GetLedger(c,c.GetString("user_id"));if e!=nil{paymentError(c,e);return};RespondSuccess(c,x)}
