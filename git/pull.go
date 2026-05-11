package git

import (
	"fmt"
	"os/exec"

	"github.com/Otard95/ngm/lib/slice"
	"github.com/Otard95/ngm/ui"
)

func Pull(userArgs []string, mux bool, muxN int) {
	dirs := getDirectories(false)

	var muxState *MuxState
	if mux {
		var err error
		muxState, err = InitMux(dirs, muxN)
		if err != nil {
			fmt.Printf("Failed to establish SSH multiplexing: %v\n", err)
			return
		}
		defer muxState.Close()
	}

	tasks := slice.Map(dirs, func(dir string, _ int) ui.Task[string] {
		return ui.Task[string]{
			Name:  dir,
			State: ui.NotStarted,
			Run: func() (string, error) {
				if muxState != nil {
					defer muxState.Acquire()()
				}

				args := slice.Concat([]string{"-C", dir, "pull"}, userArgs)
				cmd := exec.Command("git", args...)
				if muxState != nil {
					muxState.ApplyToCmd(cmd, dir)
				}
				out, err := cmd.CombinedOutput()
				out_str := string(out)
				return out_str, err
			},
		}
	})

	results := ui.DisplayParallelProgress(tasks)

	for i, dir := range dirs {
		out, err := results[i].Unwrap()
		if err != nil {
			fmt.Printf(" %s %s\n%s\n%v\n", ui.ErrorStyle.Render("⨯"), dir, out, err)
		} else {
			fmt.Printf(" %s %s\n%s\n", ui.SuccessStyle.Render("✔"), dir, out)
		}
	}
}
