package git

import (
	"fmt"
	"os"
	"slices"
	"strings"

	"github.com/Otard95/ngm/lib/slice"
	"github.com/Otard95/ngm/log"
	"github.com/Otard95/ngm/ui"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/davecgh/go-spew/spew"
)

// Catppuccin style guide: https://github.com/catppuccin/catppuccin/blob/main/docs/style-guide.md
var (
	cursor = lipgloss.NewStyle().Background(ui.ColorOverlay2).Foreground(ui.ColorCrust)
	help   = lipgloss.NewStyle().Foreground(ui.ColorOverlay1)
)

type line interface {
	isLine()
}
type renderer interface {
	Render() string
}
type parented interface {
	Parent() line
}
type toggleable interface {
	Open() bool
	SetOpen(s bool)
}

type childLine struct {
	parent line
}

func (l childLine) Parent() line {
	return l.parent
}

type toggle struct {
	open bool
}

func (t toggle) Open() bool {
	return t.open
}
func (t *toggle) SetOpen(s bool) {
	t.open = s
}

type textLine struct {
	text string
	childLine
}

func (textLine) isLine() {}
func (t textLine) Render() string {
	return t.text
}

type dirLine struct {
	text string
	dir  *directory
	toggle
}

func (dirLine) isLine() {}
func (d dirLine) Render() string {
	return fmt.Sprintf("%s %s %s", d.text, d.dir.stat.Glance(), d.dir.stat.PrintBranchInfo())
}

type untrackedLine struct {
	text string
	file string
	dir  *directory
	childLine
}

func (untrackedLine) isLine() {}
func (u untrackedLine) Render() string {
	return u.text
}

type unstagedLine struct {
	text   string
	dir    *directory
	stat   *status
	change change
	toggle
	childLine
}

func (unstagedLine) isLine() {}
func (u unstagedLine) Render() string {
	return u.text
}

type stagedLine struct {
	text   string
	dir    *directory
	stat   *status
	change change
	toggle
	childLine
}

func (stagedLine) isLine() {}
func (s stagedLine) Render() string {
	return s.text
}

type diffLine struct {
	text string
	dir  *directory
	dif  *diff
	childLine
}

func (diffLine) isLine() {}
func (s diffLine) Render() string {
	if strings.HasPrefix(s.text, "@") {
		return diffHeader.Render(s.text)
	}
	if strings.HasPrefix(s.text, "+") {
		return diffAdd.Render(s.text)
	}
	if strings.HasPrefix(s.text, "-") {
		return diffRemove.Render(s.text)
	}
	return diffUnchanged.Render(s.text)
}

func lineChildren(parent line) []line {
	switch v := parent.(type) {
	case *dirLine:
		children := slice.Concat(
			slice.Map(v.dir.stat.untracked, func(file_path string, i int) line {
				return &untrackedLine{
					text:      untracked_style.Render(fmt.Sprintf("   %s", file_path)),
					file:      file_path,
					dir:       v.dir,
					childLine: childLine{parent: parent},
				}
			}),
			slice.Map(v.dir.stat.unstaged, func(change change, i int) line {
				return &unstagedLine{
					text:      unstaged_style.Render("  " + change.String()),
					dir:       v.dir,
					stat:      v.dir.stat,
					change:    change,
					toggle:    toggle{open: false},
					childLine: childLine{parent: parent},
				}
			}),
			slice.Map(v.dir.stat.staged, func(change change, i int) line {
				return &stagedLine{
					text:      staged_style.Render("  " + change.String()),
					dir:       v.dir,
					stat:      v.dir.stat,
					change:    change,
					toggle:    toggle{open: false},
					childLine: childLine{parent: parent},
				}
			}),
		)
		if len(children) == 0 {
			children = append(children, textLine{text: "No changes", childLine: childLine{parent: v}})
		}
		return children

	case *unstagedLine:
		dif := slice.Find(v.dir.dif, func(diff diff) bool { return diff.src == ("a/" + v.change.file) })
		if dif == nil {
			return []line{&textLine{
				text:      "   No diff",
				childLine: childLine{parent: v},
			}}
		}
		return slice.Map(dif.hunk, func(hunk_line string, i int) line {
			return &diffLine{
				text:      hunk_line,
				dir:       v.dir,
				dif:       dif,
				childLine: childLine{parent: v},
			}
		})
	}
	return []line{}
}

type model struct {
	lines       []line
	directories []*directory
	showHelp    bool
	cursor      int
	scroll      int
	height      int
	width       int
}

func (model *model) up() {
	if model.cursor > 0 {
		model.cursor--
	}
	// Auto scroll when cursor is less than 5 lines from the top
	if model.scroll > model.cursor-5 {
		model.scroll = max(model.cursor-5, 0)
	}
}

func (model *model) down() {
	if model.cursor < len(model.lines)-1 {
		model.cursor++
	}
	// Auto scroll when cursor is less than 5 lines from the bottom
	if model.scroll+model.height < model.cursor+5 {
		model.scroll = model.cursor + 5 - model.height
	}
}

func (model *model) toggleLine() {
	current_line := model.lines[model.cursor]
	if toggle_line, ok := current_line.(toggleable); ok {
		if toggle_line.Open() {
			model.closeLine(current_line)
			toggle_line.SetOpen(false)
			return
		}
		toggle_line.SetOpen(true)
		model.lines = slices.Insert(
			model.lines,
			model.cursor+1,
			lineChildren(current_line)...,
		)
	} else if parented_line, ok := current_line.(parented); ok {
		i := slices.Index(model.lines, parented_line.Parent())
		if i != -1 {
			model.cursor = i
			model.toggleLine()
		}
	}
}

func (model *model) closeLine(lineToClose line) {
	parents := []line{lineToClose}
	model.lines = slice.Filter(model.lines, func(l line, i int) bool {
		if parented_line, ok := l.(parented); ok {
			parent := parented_line.Parent()
			if parent == nil {
				return true
			}

			isChildOfLineToClose := slices.Index(parents, parent) != -1
			if isChildOfLineToClose {
				parents = append(parents, l)
			}
			return !isChildOfLineToClose
		}
		return true
	})
}

func initialModel(directories []*directory) model {
	return model{
		directories: directories,
		cursor:      0,
		lines: slice.Map(directories, func(dir *directory, _ int) line {
			return &dirLine{
				text: dir.path,
				dir:  dir,
			}
		}),
	}
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit
		case "up", "k":
			m.up()
		case "down", "j":
			m.down()
		case "tab", "=", " ":
			m.toggleLine()
		}
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	}

	return m, nil
}

func (model model) View() string {
	lines := []string{fmt.Sprintf(
		"\n %s\n",
		help.Render("j/↓ (down) | k/↑ (up) | =/tab/space (toggle) | q/ctrl+c (quit)"),
	)}

	for i, line := range model.lines {
		if l, ok := line.(renderer); ok {
			text := l.Render()
			if i == model.cursor {
				text = cursor.Render(text)
			}
			lines = append(lines, fmt.Sprintf("%s", text))
		}
	}

	lines = append(lines, "")

	return slice.Join(lines[model.scroll:min(model.scroll+model.height, len(lines))], "\n")
}

type directory struct {
	path string
	stat *status
	dif  []diff
}

func Interactive() {
	paths := getDirectories(false)

	dirs := slice.ParallelMap(
		paths,
		func(path string, _ int) *directory {
			stat, _ := getStatus(path)
			dif, _ := getDiff(path)
			return &directory{
				path: path,
				stat: stat,
				dif:  dif,
			}
		},
	)

	p := tea.NewProgram(
		initialModel(dirs),
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	)

	var err error
	if _, err = p.Run(); err != nil {
		log.Errorf("Alas, there's been an error: %v", err)
		os.Exit(1)
	}

	spew.Dump(dirs)

}
