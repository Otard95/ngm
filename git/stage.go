package git

import "os/exec"

func stageChange(dir string, change change) error {
	sub_cmd := "add"
	if change.kind == DELETED {
		sub_cmd = "rm"
	}

	cmd := exec.Command("git", "-C", dir, sub_cmd, change.file)
	_, err := cmd.CombinedOutput()
	return err
}

func stagePath(dir string, path string) error {
	cmd := exec.Command("git", "-C", dir, "add", path)
	_, err := cmd.CombinedOutput()
	return err
}

func unstageChange(dir string, change change) error {
	cmd := exec.Command("git", "-C", dir, "reset", "HEAD", change.file)
	_, err := cmd.CombinedOutput()
	return err
}
