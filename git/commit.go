package git

import "os/exec"

func doCommit(dir, message string) (string, error) {
	cmd := exec.Command("git", "-C", dir, "commit", "-m", message)
	out, err := cmd.CombinedOutput()
	out_str := string(out)
	return out_str, err
}

