package git

import (
	"os"
	"path"
	"strings"

	"github.com/Otard95/ngm/log"
)

func getDirectories(reindex bool) []string {
	var dirs []string

	content, err := os.ReadFile("./.ngm/directories")
	if err != nil || reindex {
		log.Debugf("Indexing git directories: err = %v | reindex = %b\n", err, reindex)
		dirs = findAllGitDirectories("./")
		os.MkdirAll("./.ngm", 0755)
		os.WriteFile("./.ngm/directories", []byte(strings.Join(dirs, "\n")), 0644)
	} else {
		dirs = strings.Split(strings.ReplaceAll(string(content), "\r\n", "\n"), "\n")
	}
	log.Debugf("Found dirs: %v\n", dirs)

	return dirs
}

func findAllGitDirectories(basePath string) []string {
	entries, err := os.ReadDir(basePath)
	if err != nil {
		panic(err)
	}

	var paths []string
	for _, e := range entries {
		if e.IsDir() {
			if e.Name() == ".git" {
				paths = append(paths, basePath)
			} else {
				paths = append(paths, findAllGitDirectories(path.Join(basePath, e.Name()))...)
			}
		}
	}

	return paths
}
