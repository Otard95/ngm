package log

import (
	"fmt"
	"os"
	"strings"
)

type Level int

func LevelFromString(s string) Level {
	switch strings.ToLower(s) {
	case "error":
		return LevelError
	case "warning":
		return LevelWarning
	case "info":
		return LevelInfo
	case "debug":
		return LevelDebug
	default:
		panic(fmt.Sprintf("Invalid level string: %s", s))
	}
}

const (
	LevelError Level = iota
	LevelWarning
	LevelInfo
	LevelDebug
)

var level Level = LevelFromString(getEnv("LOG_LEVEL", "error"))

func Logf(l Level, format string, a ...any) {
	if l > level {
		return
	}

	fmt.Printf(levelPrefix(l)+" "+format, a...)
}
func Logln(l Level, msg string) {
	Logf(l, "%s\n", msg)
}

func Errorf(format string, a ...any) {
	Logf(LevelError, format, a...)
}
func Errorln(msg string) {
	Logln(LevelError, msg)
}

func Warningf(format string, a ...any) {
	Logf(LevelWarning, format, a...)
}
func Warningln(msg string) {
	Logln(LevelWarning, msg)
}

func Infof(format string, a ...any) {
	Logf(LevelInfo, format, a...)
}
func Infoln(msg string) {
	Logln(LevelInfo, msg)
}

func Debugf(format string, a ...any) {
	Logf(LevelDebug, format, a...)
}
func Debugln(msg string) {
	Logln(LevelDebug, msg)
}

func getEnv(name, defaultValue string) string {
	env := os.Getenv(name)
	if len(env) == 0 {
		env = defaultValue
	}
	return env
}

func levelPrefix(l Level) string {
	switch l {
	case LevelError:
		return "[ERROR]"
	case LevelWarning:
		return "[WARNING]"
	case LevelInfo:
		return "[INFO]"
	case LevelDebug:
		return "[DEBUG]"
	default:
		panic(fmt.Sprintf("Invalid level: %d", l))
	}
}
