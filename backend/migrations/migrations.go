package migrations

import "embed"

// FS embeds all SQL migration files so they are compiled into the binary.
//
//go:embed *.sql
var FS embed.FS
