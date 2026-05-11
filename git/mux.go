package git

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/Otard95/ngm/log"
)

// MuxSockets holds the mapping of SSH destination -> socket path
// and manages cleanup of the ControlMaster connections.
type MuxSockets struct {
	dir     string
	sockets map[string]string // destination -> socket path
}

// Get returns the socket path for the given SSH destination, if any.
func (m *MuxSockets) Get(destination string) (string, bool) {
	s, ok := m.sockets[destination]
	return s, ok
}

// Close tears down all ControlMaster connections and removes the socket directory.
func (m *MuxSockets) Close() {
	for dest, sock := range m.sockets {
		log.Debugf("Closing ControlMaster for %s\n", dest)
		cmd := exec.Command("ssh", "-S", sock, "-O", "exit", dest)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			log.Debugf("Warning: failed to close ControlMaster for %s: %v\n", dest, err)
		}
	}
	os.RemoveAll(m.dir)
}

// EstablishMasters creates a ControlMaster connection for each SSH destination.
// Stdin/stdout/stderr are connected to the terminal so PIN prompts work.
// Returns an error immediately if any master fails to establish.
func EstablishMasters(destinations []string) (*MuxSockets, error) {
	dir := filepath.Join(os.TempDir(), fmt.Sprintf("ngm-%d", os.Getpid()))
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("failed to create socket directory: %w", err)
	}

	mux := &MuxSockets{
		dir:     dir,
		sockets: make(map[string]string),
	}

	for _, dest := range destinations {
		sock := filepath.Join(dir, dest)
		log.Debugf("Establishing ControlMaster for %s at %s\n", dest, sock)

		cmd := exec.Command("ssh",
			"-M",       // Master mode
			"-S", sock, // Socket path
			"-N", // No remote command
			"-f", // Background after auth
			dest,
		)
		cmd.Stdin = os.Stdin
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Run(); err != nil {
			// Clean up any masters we already established
			mux.Close()
			return nil, fmt.Errorf("failed to establish ControlMaster for %s: %w", dest, err)
		}

		mux.sockets[dest] = sock
	}

	return mux, nil
}

// GitSSHCommand returns the GIT_SSH_COMMAND value that will use the given socket.
func GitSSHCommand(socketPath string) string {
	return fmt.Sprintf("ssh -S %s -o ControlMaster=auto", socketPath)
}

// MuxState holds everything needed to apply multiplexing to git commands.
type MuxState struct {
	Sockets  *MuxSockets
	DirToSSH map[string]string
	Sem      chan struct{}
}

// InitMux sets up SSH multiplexing for the given directories.
// The caller must defer MuxState.Sockets.Close().
func InitMux(dirs []string, maxConcurrent int) (*MuxState, error) {
	dirToSSH, uniqueDestinations := ExtractUniqueRemotes(dirs)

	sockets, err := EstablishMasters(uniqueDestinations)
	if err != nil {
		return nil, err
	}

	fmt.Println("SSH multiplexing established for:")
	for _, dest := range uniqueDestinations {
		sock, _ := sockets.Get(dest)
		fmt.Printf("  %s -> %s\n", dest, sock)
	}

	return &MuxState{
		Sockets:  sockets,
		DirToSSH: dirToSSH,
		Sem:      make(chan struct{}, maxConcurrent),
	}, nil
}

// ApplyToCmd sets GIT_SSH_COMMAND on the exec.Cmd if the dir has a multiplexed SSH remote.
func (m *MuxState) ApplyToCmd(cmd *exec.Cmd, dir string) {
	if dest, ok := m.DirToSSH[dir]; ok {
		if sock, ok := m.Sockets.Get(dest); ok {
			cmd.Env = append(os.Environ(), "GIT_SSH_COMMAND="+GitSSHCommand(sock))
		}
	}
}

// Close tears down all ControlMaster connections.
func (m *MuxState) Close() {
	m.Sockets.Close()
}

// Acquire takes a semaphore slot, blocking if at capacity.
// Returns a release function to be deferred.
func (m *MuxState) Acquire() func() {
	m.Sem <- struct{}{}
	return func() { <-m.Sem }
}
