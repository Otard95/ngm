package git

import (
	"fmt"
	"os/exec"
	"strings"

	"github.com/Otard95/ngm/lib/slice"
	"github.com/Otard95/ngm/ui"
)

type diff struct {
	src     string
	dst     string
	headers []string
	hunk    []string
}

func (diff diff) Title() string {
	a, _ := strings.CutPrefix(diff.src, "a/")
	b, _ := strings.CutPrefix(diff.dst, "b/")
	if diff.src == "/dev/null" {
		return b + " [added]"
	}
	if diff.dst == "/dev/null" {
		return a + " [deleted]"
	}
	if diff.dst != diff.src {
		return a + " -> " + b
	} else {
		return a
	}
}
func (diff diff) String() string {
	title := diff.Title()

	return "┏" + strings.Repeat("━", len(title)+2) + "┓\n" +
		"┃ " + title + " ┃\n" +
		"┗" + strings.Repeat("━", len(title)+2) + "┛\n" +
		slice.Join(
			slice.Map(
				diff.hunk,
				func(l string, _ int) string {
					if strings.HasPrefix(l, "-") {
						return ui.ErrorStyle.Render(l)
					}
					if strings.HasPrefix(l, "+") {
						return ui.SuccessStyle.Render(l)
					}
					return l
				},
			),
			"\n",
		)

}
func (diff diff) Patch() string {
	return slice.Join(
		slice.Concat(
			diff.headers,
			[]string{
				"--- " + diff.src,
				"+++ " + diff.dst,
			},
			diff.hunk,
		),
		"\n",
	)
}

func Diff() {
	dirs := getDirectories(false)

	tasks := slice.Map(dirs, func(dir string, _ int) ui.Task[[]diff] {
		return ui.Task[[]diff]{
			Name:  dir,
			State: ui.NotStarted,
			Run: func() ([]diff, error) {
				return getDiff(dir)
			},
		}
	})

	results := ui.DisplayParallelProgress(tasks)

	for i, dir := range dirs {
		out, err := results[i].Unwrap()
		if err != nil {
			fmt.Printf(" %s %s\n%v\n", ui.ErrorStyle.Render("⨯"), dir, err)
		} else {
			fmt.Printf(" %s %s\n%s\n", ui.SuccessStyle.Render("✔"), dir, slice.Join(
				slice.Map(
					out,
					func(d diff, _ int) string {
						return d.String()
					},
				),
				"\n\n",
			))
		}
	}
}

func getDiff(dir string) ([]diff, error) {
	cmd := exec.Command("git", "-C", dir, "diff", "HEAD")
	out, err := cmd.CombinedOutput()
	out_str := string(out)
	if err != nil {
		return nil, err
	}
	return parseGitDiff(&out_str), nil
}

func parseGitDiff(raw_diff *string) []diff {
	diffs := []diff{}
	headers := []string{}
	src, dst := "", ""
	hunkLines := []string{}

	lines := strings.Split(*raw_diff, "\n")

	for _, line := range lines {
		if strings.HasPrefix(line, "diff") {
			if len(src) > 0 {
				diffs = append(diffs, diff{
					src:     src,
					dst:     dst,
					headers: headers,
					hunk:    hunkLines,
				})
				headers = []string{}
				src, dst = "", ""
				hunkLines = []string{}
			}
			headers = append(headers, line)
			continue
		}

		if strings.HasPrefix(line, "---") {
			src, _ = strings.CutPrefix(line, "--- ")
			continue
		}
		if strings.HasPrefix(line, "+++") {
			dst, _ = strings.CutPrefix(line, "+++ ")
			continue
		}

		if strings.HasPrefix(line, "@@") {
			hunkLines = append(hunkLines, line)
			continue
		}

		if len(hunkLines) > 0 {
			hunkLines = append(hunkLines, line)
		} else {
			headers = append(headers, line)
		}
	}

	if len(src) > 0 {
		diffs = append(diffs, diff{
			src:     src,
			dst:     dst,
			headers: headers,
			hunk:    hunkLines,
		})
	}

	return diffs
}
