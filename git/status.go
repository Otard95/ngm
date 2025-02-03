package git

import (
	"fmt"
	"os/exec"

	"github.com/Otard95/ngm/lib/slice"
	"github.com/Otard95/ngm/ui"
)

func Status() {
	dirs := getDirectories(false)

	tasks := slice.Map(dirs, func(dir string, _ int) ui.Task[string] {
		return ui.Task[string]{
			Name:  dir,
			State: ui.NotStarted,
			Run: func() (string, error) {
				cmd := exec.Command("git", "-C", dir, "status", "--porcelain", "-b")
				out, err := cmd.CombinedOutput()
				if err != nil {
					return string(out), err
				}
				return string(out), nil
			},
		}
	})

	results := ui.DisplayParallelProgress(tasks)

	for i, dir := range dirs {
		out, err := results[i].Unwrap()
		if err != nil {
			fmt.Printf(" %s %s\n%s\n", ui.ErrorStyle.Render("⨯"), dir, out)
		} else {
			fmt.Printf(" %s %s\n%s\n", ui.SuccessStyle.Render("✔"), dir, out)
		}
	}
}
