package git

import (
	"fmt"
	"os"
	"slices"
	"strings"

	"github.com/Otard95/ngm/lib/slice"
	"github.com/Otard95/ngm/log"
	"github.com/Otard95/ngm/ui"
	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/bubbles/textarea"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	// "github.com/davecgh/go-spew/spew"
)

// Catppuccin style guide: https://github.com/catppuccin/catppuccin/blob/main/docs/style-guide.md
var (
	cursor_style    = lipgloss.NewStyle().Background(ui.ColorOverlay0).Foreground(ui.ColorCrust)
	help_key_style  = lipgloss.NewStyle().Foreground(ui.ColorSubtext0)
	help_desc_style = lipgloss.NewStyle().Foreground(ui.ColorOverlay0)
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
		children := []line{}
		countUntracked := len(v.dir.stat.untracked)
		if countUntracked > 0 {
			children = slices.Concat(
				children,
				[]line{textLine{text: fmt.Sprintf("Untracked (%d)", countUntracked), childLine: childLine{parent: v}}},
				slice.Map(v.dir.stat.untracked, func(file_path string, i int) line {
					return &untrackedLine{
						text:      untracked_style.Render(fmt.Sprintf("  %s", file_path)),
						file:      file_path,
						dir:       v.dir,
						childLine: childLine{parent: parent},
					}
				}),
				[]line{textLine{text: " ", childLine: childLine{parent: v}}},
			)
		}

		countUnstaged := len(v.dir.stat.unstaged)
		if countUnstaged > 0 {
			children = slices.Concat(
				children,
				[]line{textLine{text: fmt.Sprintf("Unstaged (%d)", countUnstaged), childLine: childLine{parent: v}}},
				slice.Map(v.dir.stat.unstaged, func(change change, i int) line {
					return &unstagedLine{
						text:      unstaged_style.Render("  " + change.String()),
						dir:       v.dir,
						change:    change,
						toggle:    toggle{open: false},
						childLine: childLine{parent: parent},
					}
				}),
				[]line{textLine{text: " ", childLine: childLine{parent: v}}},
			)
		}

		countStaged := len(v.dir.stat.staged)
		if countStaged > 0 {
			children = slices.Concat(
				children,
				[]line{textLine{text: fmt.Sprintf("Staged (%d)", countStaged), childLine: childLine{parent: v}}},
				slice.Map(v.dir.stat.staged, func(change change, i int) line {
					return &stagedLine{
						text:      staged_style.Render("  " + change.String()),
						dir:       v.dir,
						change:    change,
						toggle:    toggle{open: false},
						childLine: childLine{parent: parent},
					}
				}),
				[]line{textLine{text: " ", childLine: childLine{parent: v}}},
			)
		}
		if len(children) == 0 {
			children = append(
				children,
				textLine{text: "No changes", childLine: childLine{parent: v}},
				textLine{text: " ", childLine: childLine{parent: v}},
			)
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

	case *stagedLine:
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

type keymap = struct {
	down, up, toggle, stage, unstage, commit, help, quit key.Binding
}

type model struct {
	lines       []line
	directories []*directory
	keymap      keymap
	help        help.Model
	showHelp    bool
	cursor      int
	scroll      int
	height      int
	width       int
	committing  bool
	afterCommit bool
	textInput   textarea.Model
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
	line := model.lines[model.cursor]
	if toggle_line, ok := line.(toggleable); ok {
		if toggle_line.Open() {
			model.closeLine(line)
			toggle_line.SetOpen(false)
			return
		}
		toggle_line.SetOpen(true)
		model.lines = slices.Insert(
			model.lines,
			model.cursor+1,
			lineChildren(line)...,
		)
	} else if parented_line, ok := line.(parented); ok {
		i := slices.Index(model.lines, parented_line.Parent())
		if i != -1 {
			model.cursor = i
			// Auto scroll when cursor is less than 5 lines from the top
			if model.scroll > model.cursor-5 {
				model.scroll = max(model.cursor-5, 0)
			}
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

func (model *model) stage() {
	current_line := model.lines[model.cursor]
	var (
		parent line
		dir    *directory
	)
	if unstaged, ok := current_line.(*unstagedLine); ok {
		err := stageChange(unstaged.dir.path, unstaged.change)
		if err != nil {
			panic(err)
		}

		parent = unstaged.parent
		dir = unstaged.dir
	}

	if untracked, ok := current_line.(*untrackedLine); ok {
		err := stagePath(untracked.dir.path, untracked.file)
		if err != nil {
			panic(err)
		}

		parent = untracked.parent
		dir = untracked.dir
	}

	if parent != nil && dir != nil {
		stat, err := getStatus(dir.path)
		if err != nil {
			panic(err)
		}
		dir.stat = stat

		prev_cursor := model.cursor
		model.cursor = slices.Index(model.lines, parent)
		model.toggleLine()
		model.toggleLine()
		model.cursor = min(prev_cursor, len(model.lines)-1)
	}
}

func (model *model) unstage() {
	current_line := model.lines[model.cursor]
	if staged, ok := current_line.(*stagedLine); ok {
		err := unstageChange(staged.dir.path, staged.change)
		if err != nil {
			panic(err)
		}

		stat, err := getStatus(staged.dir.path)
		if err != nil {
			panic(err)
		}
		staged.dir.stat = stat

		prev_cursor := model.cursor
		model.cursor = slices.Index(model.lines, staged.parent)
		model.toggleLine()
		model.toggleLine()
		model.cursor = min(prev_cursor, len(model.lines)-1)
	}
}

type commitResult struct {
	text string
	path string
	ok   bool
}

func (model *model) commit(message string) []commitResult {
	return slice.ParallelMap(
		slice.Filter(model.directories, func(dir *directory, _ int) bool {
			return len(dir.stat.staged) > 0
		}),
		func(dir *directory, _ int) commitResult {
			result, err := doCommit(dir.path, message)
			return commitResult{
				text: result,
				path: dir.path,
				ok:   err == nil,
			}
		},
	)
}

func (model *model) reset() {
	dirs := slice.ParallelMap(
		slice.Map(model.directories, func(dir *directory, _ int) string { return dir.path }),
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
	model.directories = dirs
	model.lines = slice.Map(dirs, func(dir *directory, _ int) line {
		return &dirLine{
			text: dir.path,
			dir:  dir,
		}
	})
	model.showHelp = false
	model.cursor = 0
	model.scroll = 0
	model.committing = false
	model.afterCommit = false
	model.textInput.Reset()
	model.textInput.Blur()
}

func newTextarea() textarea.Model {
	t := textarea.New()
	// t.Prompt = ""
	t.Placeholder = "Commit message"
	t.ShowLineNumbers = true
	t.Cursor.Style = cursor_style
	t.FocusedStyle.Placeholder = lipgloss.NewStyle().Foreground(ui.ColorOverlay1)
	t.BlurredStyle.Placeholder = lipgloss.NewStyle().Foreground(ui.ColorOverlay0)
	t.FocusedStyle.CursorLine = lipgloss.NewStyle().Background(ui.ColorSurface0)
	t.KeyMap.DeleteWordBackward.SetEnabled(false)
	t.KeyMap.LineNext = key.NewBinding(key.WithKeys("down"))
	t.KeyMap.LinePrevious = key.NewBinding(key.WithKeys("up"))
	t.Blur()
	return t
}

func initialModel(directories []*directory) model {
	help := help.New()
	help.Styles.ShortKey = help_key_style
	help.Styles.ShortDesc = help_desc_style
	help.Styles.ShortSeparator = lipgloss.NewStyle().Foreground(ui.ColorOverlay0)

	return model{
		directories: directories,
		cursor:      0,
		lines: slice.Map(directories, func(dir *directory, _ int) line {
			return &dirLine{
				text: dir.path,
				dir:  dir,
			}
		}),
		textInput: newTextarea(),
		help:      help,
		keymap: keymap{
			help: key.NewBinding(
				key.WithKeys("h"),
				key.WithHelp("h", "help"),
			),
			quit: key.NewBinding(
				key.WithKeys("q", "ctrl+c"),
				key.WithHelp("q", "quit"),
			),
			toggle: key.NewBinding(
				key.WithKeys("tab", "space", "="),
				key.WithHelp("space/tab", "toggle"),
			),
			up: key.NewBinding(
				key.WithKeys("up", "k"),
				key.WithHelp("↑", "up"),
			),
			down: key.NewBinding(
				key.WithKeys("down", "j"),
				key.WithHelp("↓", "down"),
			),
			unstage: key.NewBinding(
				key.WithKeys("u"),
				key.WithHelp("u", "unstage"),
			),
			stage: key.NewBinding(
				key.WithKeys("s"),
				key.WithHelp("s", "stage"),
			),
			commit: key.NewBinding(
				key.WithKeys("c"),
				key.WithHelp("c", "commit"),
			),
		},
	}
}

func (model model) Init() tea.Cmd {
	return textarea.Blink
}

func (model model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	justStartedCommitting := false

	switch msg := msg.(type) {
	case tea.KeyMsg:
		if model.committing {
			switch msg.String() {
			case "ctrl+c":
				result := model.commit(model.textInput.Value())
				model.textInput.SetValue(slice.Join(slice.Map(
					result,
					func(res commitResult, _ int) string {
						out := ""
						if res.ok {
							out = "[OK]"
						} else {
							out = "[ERROR]"
						}

						out += res.path + "\n" + res.text + "\n\n"
						return out
					},
				), "\n"))
				model.textInput.Blur()
				model.committing = false
				model.afterCommit = true
			}
		} else if model.afterCommit {
			switch msg.String() {
			case "ctrl+c":
				model.reset()
			}
		} else {
			switch {
			case key.Matches(msg, model.keymap.quit):
				return model, tea.Quit

			case key.Matches(msg, model.keymap.up):
				model.up()

			case key.Matches(msg, model.keymap.down):
				model.down()

			case key.Matches(msg, model.keymap.toggle):
				model.toggleLine()

			case key.Matches(msg, model.keymap.stage):
				model.stage()

			case key.Matches(msg, model.keymap.unstage):
				model.unstage()

			case key.Matches(msg, model.keymap.commit):
				model.committing = true
				justStartedCommitting = true
				model.textInput.Focus()

			case key.Matches(msg, model.keymap.help):
				model.showHelp = !model.showHelp

			}
		}

	case tea.WindowSizeMsg:
		model.width = msg.Width
		model.height = msg.Height
		model.textInput.SetWidth(model.width)
		model.textInput.SetHeight(min(model.height-1, 20))
	}

	if justStartedCommitting {
		msg = nil
	}
	newTextInput, cmd := model.textInput.Update(msg)
	model.textInput = newTextInput

	return model, cmd
}

func (model model) View() string {
	if model.showHelp {
		return `
  Key        | Alt key | Action
  -----------|---------|-------
  Ctrl+c     | q       | Quit
  Arrow Up   | k       | Move the cursor up
  Arrow Down | j       | Move the cursor Down
  Tab        | Space   | Open/close the line under the cursor
  s          |         | Stage the change under the cursor
  u          |         | Unstage the change under the cursor
  h          |         | Toggle this help screen`
	} else if model.committing || model.afterCommit {
		return model.textInput.View() + "\nCtrl+c to continue"
	} else {
		lines := []string{fmt.Sprintf(
			"\n %s\n",
			model.help.ShortHelpView([]key.Binding{
				model.keymap.up,
				model.keymap.down,
				model.keymap.toggle,
				model.keymap.quit,
				model.keymap.help,
			}),
		)}

		for i, line := range model.lines {
			if l, ok := line.(renderer); ok {
				text := l.Render()
				if i == model.cursor {
					text = cursor_style.Render(text)
				}
				lines = append(lines, fmt.Sprintf("%s", text))
			}
		}

		lines = append(lines, " ")

		return slice.Join(lines[model.scroll:min(model.scroll+model.height, len(lines))], "\n")
	}
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

	// spew.Dump(dirs)

}
