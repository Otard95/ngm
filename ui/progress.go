package ui

import (
	"fmt"
	"os"
	"strings"

	"github.com/Otard95/ngm/lib/slice"
	"github.com/charmbracelet/bubbles/spinner"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type TaskState int

func (s TaskState) Icon(spinner spinner.Model) string {
	switch s {
	case NotStarted:
		return " • "
	case Running:
		return spinner.View()
	case Complete:
		return SuccessStyle.Render(" ✔ ")
	case Error:
		return ErrorStyle.Render(" ⨯ ")
	}
	return "?"
}
func (s TaskState) IsDone() bool {
	switch s {
	case Complete:
		return true
	case Error:
		return true
	}
	return false
}

const (
	NotStarted TaskState = iota
	Running
	Complete
	Error
)

type Result[T any] struct {
	value T
	error error
}

func (r Result[T]) Unwrap() (T, error) {
	return r.value, r.error
}

type Task[T any] struct {
	Name   string
	State  TaskState
	Run    func() (T, error)
	Result Result[T]
}

func (t Task[T]) Render(spinner spinner.Model) string {
	return fmt.Sprintf(" %s %s", t.State.Icon(spinner), t.Name)
}

type TaskMsg[T any] struct {
	Index int
	Value T
	Error error
}
type TaskCmd[T any] func() TaskMsg[T]

type model[T any] struct {
	tasks    []Task[T]
	spinner  spinner.Model
	ready    bool
	viewport viewport.Model
}

func initialModel[T any](tasks []Task[T]) model[T] {
	s := spinner.New()
	s.Spinner = spinner.Points
	s.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("#179299"))

	return model[T]{
		tasks:   tasks,
		spinner: s,
	}
}

func (m model[any]) Init() tea.Cmd {
	cmds := slice.Map(m.tasks, func(t Task[any], i int) tea.Cmd {
		return func() tea.Msg {
			m.tasks[i].State = Running
			value, err := t.Run()
			return TaskMsg[any]{Index: i, Value: value, Error: err}
		}
	})
	cmds = append(cmds, m.spinner.Tick)

	return tea.Batch(cmds...)
}

func (m model[any]) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	if slice.Every(
		m.tasks,
		func(task Task[any]) bool { return task.State.IsDone() },
	) {
		return m, tea.Quit
	}

	var (
		cmd  tea.Cmd
		cmds []tea.Cmd
	)

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		if !m.ready {
			m.viewport = viewport.New(msg.Width, msg.Height)
			m.ready = true
		} else {
			m.viewport.Width = msg.Width
			m.viewport.Height = msg.Height
		}

	case TaskMsg[any]:
		m.tasks[msg.Index].Result = Result[any]{
			value: msg.Value, error: msg.Error,
		}
		if msg.Error == nil {
			m.tasks[msg.Index].State = Complete
		} else {
			m.tasks[msg.Index].State = Error
		}
	}

	m.spinner, cmd = m.spinner.Update(msg)
	if cmd != nil {
		cmds = append(cmds, cmd)
	}

	m.viewport.SetContent(
		strings.Join(
			slice.Map(
				m.tasks,
				func(task Task[any], _ int) string { return task.Render(m.spinner) },
			),
			"\n",
		),
	)

	m.viewport, cmd = m.viewport.Update(msg)
	if cmd != nil {
		cmds = append(cmds, cmd)
	}

	return m, tea.Batch(cmds...)
}

func (m model[any]) View() string {
	if m.ready {
		return m.viewport.View()
	}
	return ""
}

func DisplayParallelProgress[T any](tasks []Task[T]) []Result[T] {
	p := tea.NewProgram(
		initialModel(tasks),
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	)

	var m tea.Model
	var err error
	if m, err = p.Run(); err != nil {
		fmt.Printf("Alas, there's been an error: %v", err)
		os.Exit(1)
	}

	return slice.Map(
		m.(model[T]).tasks,
		func(t Task[T], _ int) Result[T] { return t.Result },
	)
}
