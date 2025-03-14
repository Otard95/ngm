package git

import (
	"fmt"
	"os/exec"
	"strconv"

	"github.com/Otard95/ngm/lib/slice"
	sv "github.com/Otard95/ngm/lib/string-view"
	"github.com/Otard95/ngm/ui"
	"github.com/charmbracelet/lipgloss"
)

var staged_style = lipgloss.NewStyle().Foreground(lipgloss.Color("#a6d189"))
var unstaged_style = lipgloss.NewStyle().Foreground(lipgloss.Color("#e78284"))
var untracked_style = lipgloss.NewStyle().Foreground(lipgloss.Color("#ea999c"))
var branch_icon = lipgloss.NewStyle().Foreground(lipgloss.Color("#ca9ee6"))

type changeKind int

const (
	MODIFIED changeKind = iota
	ADDED
	DELETED
	RENAMED
	COPIED
	TYPE
	UNMERGED
	CHANGE_KIND_COUNT
)

var changeKindIcon = [CHANGE_KIND_COUNT]string{"󱇨", "", "󱀷", "󱀱", "󰆏", "󱁼", ""}

func changeKindFromString(s string) changeKind {
	switch s {
	case "M":
		return MODIFIED
	case "T":
		return TYPE
	case "A":
		return ADDED
	case "D":
		return DELETED
	case "R":
		return RENAMED
	case "C":
		return COPIED
	case "U":
		return UNMERGED
	}
	panic(fmt.Sprintf("Unsupported change kind string '%s' passed to 'changeKindFromString'\n", s))
}
func (c changeKind) Icon() string {
	return changeKindIcon[c]
}

type change struct {
	kind      changeKind
	file      string
	orig_file *string
}

func (c change) String() string {
	out := c.kind.Icon() + " " + c.file
	if c.orig_file != nil {
		out += " → " + *c.orig_file
	}
	return out
}

type unmergedChange struct {
	kind [2]changeKind
	file string
}

func (c unmergedChange) String() string {
	out := ""

	switch c.kind[0] {
	case UNMERGED:
		switch c.kind[1] {
		case UNMERGED:
			out += "both modified"
		case ADDED:
			out += "added by them"
		case DELETED:
			out += "deleted by them"
		}
	case ADDED:
		switch c.kind[1] {
		case UNMERGED:
			out += "added by us"
		case ADDED:
			out += "both added"
		}
	case DELETED:
		switch c.kind[1] {
		case UNMERGED:
			out += "deleted by us"
		case DELETED:
			out += "both deleted"
		}
	default:
		out += c.kind[0].Icon() + c.kind[1].Icon()
	}

	out += " " + c.file
	return out
}

type upstream struct {
	ahead  int
	behind int
	ref    string
}
type branch struct {
	name     string
	commit   string
	upstream *upstream
}
type status struct {
	branch    branch
	staged    []change
	unstaged  []change
	unmerged  []unmergedChange
	untracked []string
}

func (s *status) Print() string {
	out := fmt.Sprintf(`%s %s`, branch_icon.Render(""), s.branch.name)
	if s.branch.upstream != nil {
		out += fmt.Sprintf(" ↑%d ↓%d", s.branch.upstream.ahead, s.branch.upstream.behind)
	}
	out += "\n"

	if len(s.staged) > 0 {
		out += slice.Join(
			slice.Map(s.staged, func(s change, _ int) string {
				return staged_style.Render(s.String())
			}),
			"\n",
		) + "\n"
	}
	if len(s.unstaged) > 0 {
		out += slice.Join(
			slice.Map(s.unstaged, func(s change, _ int) string {
				return unstaged_style.Render(s.String())
			}),
			"\n",
		) + "\n"
	}
	if len(s.unmerged) > 0 {
		out += slice.Join(
			slice.Map(s.unmerged, func(s unmergedChange, _ int) string {
				return unstaged_style.Render(s.String())
			}),
			"\n",
		) + "\n"
	}
	if len(s.untracked) > 0 {
		out += slice.Join(
			slice.Map(s.untracked, func(u string, _ int) string {
				return untracked_style.Render(" " + u)
			}),
			"\n",
		) + "\n"
	}

	return out
}

func Status() {
	dirs := getDirectories(false)

	tasks := slice.Map(dirs, func(dir string, _ int) ui.Task[*status] {
		return ui.Task[*status]{
			Name: dir,
			Run: func() (*status, error) {
				return getStatus(dir)
			},
		}
	})

	results := ui.DisplayParallelProgress(tasks)

	for i, dir := range dirs {
		statuz, err := results[i].Unwrap()
		if err != nil {
			fmt.Printf(" %s %s\n", ui.ErrorStyle.Render("⨯"), dir)
		} else {
			fmt.Printf(" %s %s %s\n", ui.SuccessStyle.Render("✔"), dir, statuz.Print())
		}
	}
}

func getStatus(dir string) (*status, error) {
	cmd := exec.Command("git", "-C", dir, "status", "--porcelain=v2", "-b")
	out, err := cmd.CombinedOutput()
	out_str := string(out)
	if err != nil {
		return nil, err
	}
	return parseGitStatus(&out_str), nil
}

func parseGitStatus(raw *string) *status {
	var statuz status
	var view = sv.New(raw)

	view.Seek(sv.Not(sv.Whitespace()))

	for view.Length() > 0 {
		line_type := view.TakeUntil(sv.Whitespace())

		switch line_type.String() {
		case "#":
			parseHeader(&statuz, view.TakeLine())
		case "1":
			parseOrdinaryChange(&statuz, view.TakeLine())
		case "2":
			parseRenameOrCopyChange(&statuz, view.TakeLine())
		case "u":
			parseUnmergedChange(&statuz, view.TakeLine())
		case "?":
			view.SeekEndOf(sv.Whitespace())
			statuz.untracked = append(statuz.untracked, view.TakeLine().String())
		default:
			view.TakeLine()
		}

		view.Seek(sv.Not(sv.Whitespace()))
	}

	return &statuz
}

func parseHeader(statuz *status, view *sv.StringView) {
	view.SeekEndOf(sv.String("."))
	branch_line_type := view.SplitOnNext(sv.Whitespace())

	switch branch_line_type.String() {
	case "oid":
		commit := view.TakeUntil(sv.Whitespace())
		statuz.branch.commit = commit.String()
	case "head":
		branch := view.TakeUntil(sv.Whitespace())
		statuz.branch.name = branch.String()
	case "upstream":
		us := view.TakeUntil(sv.Whitespace())
		if statuz.branch.upstream == nil {
			statuz.branch.upstream = &upstream{ahead: 0, behind: 0, ref: ""}
		}
		statuz.branch.upstream.ref = us.String()
	case "ab":
		if statuz.branch.upstream == nil {
			statuz.branch.upstream = &upstream{ahead: 0, behind: 0, ref: ""}
		}
		ahead_sv := view.SplitOnNext(sv.Whitespace())
		ahead_sv.Seek(sv.Digit())
		ahead, _ := strconv.Atoi(ahead_sv.String())
		statuz.branch.upstream.ahead = ahead

		view.Seek(sv.Digit())
		behind, _ := strconv.Atoi(view.String())
		statuz.branch.upstream.behind = behind
	}
}

// 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
func parseOrdinaryChange(statuz *status, view *sv.StringView) {
	view.SeekEndOf(sv.Whitespace())
	index := view.Take(1).String()
	working_tree := view.Take(1).String()

	view.Seek(sv.Letter())
	if view.Take(1).String() != "N" { // for now we don't worry about submodules
		return
	}

	view.SeekNext(sv.Whitespace()). // Skip <sub>
					SeekNext(sv.Whitespace()). // Skip <mH>
					SeekNext(sv.Whitespace()). // Skip <mI>
					SeekNext(sv.Whitespace()). // Skip <mW>
					SeekNext(sv.Whitespace()). // Skip <hH>
					SeekNext(sv.Whitespace()). // Skip <hI>
					SeekNext(sv.Letter())

	path := view.TakeLine().String()

	if index != "." {
		statuz.staged = append(
			statuz.staged,
			change{kind: changeKindFromString(index), file: path},
		)
	}
	if working_tree != "." {
		statuz.unstaged = append(
			statuz.unstaged,
			change{kind: changeKindFromString(working_tree), file: path},
		)
	}
}

// 2 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <X><score> <path><sep><origPath>
func parseRenameOrCopyChange(statuz *status, view *sv.StringView) {
	view.SeekEndOf(sv.Whitespace())
	index := view.Take(1).String()
	working_tree := view.Take(1).String()

	view.Seek(sv.Letter())
	if view.Take(1).String() != "N" { // for now we don't worry about submodules
		return
	}

	view.SeekNext(sv.Whitespace()). // Skip <sub>
					SeekNext(sv.Whitespace()). // Skip <mH>
					SeekNext(sv.Whitespace()). // Skip <mI>
					SeekNext(sv.Whitespace()). // Skip <mW>
					SeekNext(sv.Whitespace()). // Skip <hH>
					SeekNext(sv.Whitespace()). // Skip <hI>
					SeekNext(sv.Whitespace()). // Skip <X><score>
					SeekNext(sv.Letter())

	path := view.TakeUntil(sv.Whitespace()).String()
	view.Seek(sv.Not(sv.Whitespace()))
	orig_path := view.TakeLine().String()

	if index != "." {
		statuz.staged = append(
			statuz.staged,
			change{kind: changeKindFromString(index), file: path, orig_file: &orig_path},
		)
	}
	if working_tree != "." {
		statuz.unstaged = append(
			statuz.unstaged,
			change{kind: changeKindFromString(working_tree), file: path, orig_file: &orig_path},
		)
	}
}

// u <XY> <sub> <m1> <m2> <m3> <mW> <h1> <h2> <h3> <path>
func parseUnmergedChange(statuz *status, view *sv.StringView) {
	view.SeekEndOf(sv.Whitespace())
	index := view.Take(1).String()
	working_tree := view.Take(1).String()

	view.Seek(sv.Letter())
	if view.Take(1).String() != "N" { // for now we don't worry about submodules
		return
	}

	view.SeekNext(sv.Whitespace()). // Skip <sub>
					SeekNext(sv.Whitespace()). // Skip <m1>
					SeekNext(sv.Whitespace()). // Skip <m2>
					SeekNext(sv.Whitespace()). // Skip <m3>
					SeekNext(sv.Whitespace()). // Skip <mW>
					SeekNext(sv.Whitespace()). // Skip <h1>
					SeekNext(sv.Whitespace()). // Skip <h2>
					SeekNext(sv.Whitespace()). // Skip <h3>
					SeekNext(sv.Letter())

	path := view.TakeLine().String()

	statuz.unmerged = append(
		statuz.unmerged,
		unmergedChange{
			kind: [2]changeKind{
				changeKindFromString(index),
				changeKindFromString(working_tree),
			},
			file: path,
		},
	)
}
