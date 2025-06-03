package git

import (
	"fmt"
	"os"
	"slices"

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
	Render() string
}

type textLine struct {
	text   string
	parent line
}

func (textLine) isLine() {}
func (t textLine) Render() string {
	return t.text
}

type dirLine struct {
	text string
	dir  *directory
	open bool
}

func (dirLine) isLine() {}
func (d dirLine) Render() string {
	return fmt.Sprintf("%s %s %s", d.text, d.dir.stat.Glance(), d.dir.stat.PrintBranchInfo())
}

type untrackedLine struct {
	text   string
	file   string
	dir    *directory
	parent line
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
	open   bool
	parent line
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
	open   bool
	parent line
}

func (stagedLine) isLine() {}
func (s stagedLine) Render() string {
	return s.text
}

type diffLine struct {
	text   string
	dir    *directory
	dif    *diff
	parent line
}

func (diffLine) isLine() {}
func (s diffLine) Render() string {
	return s.text
}

func lineChildren(l line) []line {
	switch v := l.(type) {
	case *dirLine:
		return slice.Concat(
			slice.Map(v.dir.stat.untracked, func(s string, i int) line {
				return &untrackedLine{
					text:   untracked_style.Render(fmt.Sprintf("   %s", s)),
					file:   s,
					dir:    v.dir,
					parent: l,
				}
			}),
			slice.Map(v.dir.stat.unstaged, func(c change, i int) line {
				return &unstagedLine{
					text:   unstaged_style.Render("  " + c.String()),
					dir:    v.dir,
					stat:   v.dir.stat,
					change: c,
					open:   false,
					parent: l,
				}
			}),
			slice.Map(v.dir.stat.staged, func(c change, i int) line {
				return &stagedLine{
					text:   staged_style.Render("  " + c.String()),
					dir:    v.dir,
					stat:   v.dir.stat,
					change: c,
					open:   false,
					parent: l,
				}
			}),
		)
	case *unstagedLine:
		dif := slice.Find(v.dir.dif, func(d diff) bool { return d.src == ("a/" + v.change.file) })
		if dif == nil {
			return []line{&textLine{
				text:   "   No diff",
				parent: v,
			}}
		}
		return slice.Map(dif.hunk, func(l string, i int) line {
			return &diffLine{
				text:   l,
				dir:    v.dir,
				dif:    dif,
				parent: v,
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

func (m *model) up() {
	if m.cursor > 0 {
		m.cursor--
	}
}

func (m *model) down() {
	if m.cursor < len(m.lines)-1 {
		m.cursor++
	}
}

func (m *model) toggleLine() {
	line := m.lines[m.cursor]
	switch v := line.(type) {
	case *dirLine:
		if v.open {
			m.close(v)
			v.open = false
			return
		}
		v.open = true
		m.lines = slices.Insert(
			m.lines,
			m.cursor+1,
			lineChildren(v)...,
		)
	case *unstagedLine:
		if v.open {
			m.close(v)
			v.open = false
			return
		}
		v.open = true
		m.lines = slices.Insert(
			m.lines,
			m.cursor+1,
			lineChildren(v)...,
		)
	case *diffLine:
		i := slices.Index(m.lines, v.parent)
		if i != -1 {
			m.cursor = i
			m.toggleLine()
		}
	}
}

func (m *model) close(lineToClose line) {
	m.lines = slice.Filter(m.lines, func(l line, i int) bool {
		switch v := l.(type) {
		case *untrackedLine:
			return v.parent != lineToClose
		case *unstagedLine:
			return v.parent != lineToClose
		case *stagedLine:
			return v.parent != lineToClose
		case *diffLine:
			return v.parent != lineToClose
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

func (m model) View() string {
	lines := []string{fmt.Sprintf("\n %s\n", help.Render("j/↓ (down) | k/↑ (up) | =/tab/space (toggle) | q/ctrl+c (quit)"))}

	for i, line := range m.lines {
		text := line.Render()
		if i == m.cursor {
			text = cursor.Render(text)
		}
		lines = append(lines, fmt.Sprintf("%s", text))
	}

	return slice.Join(lines[m.scroll:min(m.scroll+m.height, len(lines))], "\n")
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
