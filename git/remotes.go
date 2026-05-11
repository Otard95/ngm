package git

import (
	"os/exec"
	"strings"

	"github.com/Otard95/ngm/log"
)

// GetCurrentBranch returns the current branch name for the repo at dir.
func GetCurrentBranch(dir string) (string, error) {
	cmd := exec.Command("git", "-C", dir, "symbolic-ref", "--short", "HEAD")
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

// GetBranchRemoteURL returns the remote URL for the given branch in the repo at dir.
// It first looks up the remote name configured for the branch, falling back to "origin".
// Then it resolves that remote name to a URL.
func GetBranchRemoteURL(dir string, branch string) (string, error) {
	remoteName := "origin"

	cmd := exec.Command("git", "-C", dir, "config", "--get", "branch."+branch+".remote")
	out, err := cmd.Output()
	if err == nil {
		remoteName = strings.TrimSpace(string(out))
	}
	log.Debugf("Remote name for %s/%s: %s\n", dir, branch, remoteName)

	cmd = exec.Command("git", "-C", dir, "remote", "get-url", remoteName)
	out, err = cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

// ParseSSHDestination extracts the SSH destination (e.g. "git@github.com")
// from a remote URL matching the pattern <user>@<host>:<repo>.
// Returns the destination and true if it matches, or empty string and false otherwise.
func ParseSSHDestination(remoteURL string) (string, bool) {
	// Must contain @ before : to be an SSH URL
	colonIdx := strings.Index(remoteURL, ":")
	atIdx := strings.Index(remoteURL, "@")

	if atIdx < 0 || colonIdx < 0 || atIdx >= colonIdx {
		return "", false
	}

	return remoteURL[:colonIdx], true
}

// ExtractUniqueRemotes takes a list of directories and returns:
// - a map of dir -> SSH destination (only for dirs with SSH remotes)
// - a deduplicated slice of unique SSH destinations
func ExtractUniqueRemotes(dirs []string) (map[string]string, []string) {
	dirToSSH := make(map[string]string)
	seen := make(map[string]bool)
	var unique []string

	for _, dir := range dirs {
		branch, err := GetCurrentBranch(dir)
		if err != nil {
			log.Debugf("Skipping %s: could not determine current branch: %v\n", dir, err)
			continue
		}

		remoteURL, err := GetBranchRemoteURL(dir, branch)
		if err != nil {
			log.Debugf("Skipping %s: could not get remote URL: %v\n", dir, err)
			continue
		}

		dest, ok := ParseSSHDestination(remoteURL)
		if !ok {
			log.Debugf("Skipping %s: remote %q is not SSH\n", dir, remoteURL)
			continue
		}

		dirToSSH[dir] = dest
		if !seen[dest] {
			seen[dest] = true
			unique = append(unique, dest)
		}
	}

	return dirToSSH, unique
}
