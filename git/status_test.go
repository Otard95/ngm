package git

import (
	"testing"
)

var statusTextRaw = `
# branch.oid 1476deeddba487aa5e58c9d696c8f3b49df6ca1e
# branch.head feat/go-rewrite
# branch.upstream origin/feat/go-rewrite
# branch.ab +0 -0
1 .M N... 100644 100644 100644 ede67606cd3cd505a02e33a7c681f792c950f14e ede67606cd3cd505a02e33a7c681f792c950f14e git/status.go
? lib/slice/find.go
? lib/string-view/
`

func TestParsingStatus(t *testing.T) {
	statuz := parseGitStatus(&statusTextRaw)
	t.Logf("%v", *statuz)
}
