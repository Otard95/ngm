package string_view

import (
	"unicode"
	"unicode/utf8"

	"github.com/Otard95/ngm/lib/slice"
)

type predicate interface {
	match(string) bool
	length(string) int
}

type startsWith string

func String(needle string) startsWith {
	return startsWith(needle)
}

func (s startsWith) match(haystack string) bool {
	return len(haystack) >= len(string(s)) && string(s) == haystack[:len(string(s))]
}
func (s startsWith) length(_ string) int {
	return len(string(s))
}

type not struct {
	p predicate
}

func Not(p predicate) not {
	return not{p: p}
}

func (n not) match(haystack string) bool {
	return !(n.p).match(haystack)
}
func (n not) length(haystack string) int {
	return n.length(haystack)
}

type or struct {
	p []predicate
}

func Or(p ...predicate) or {
	return or{p: p}
}

func (o or) match(haystack string) bool {
	return slice.Some(o.p, func(p predicate) bool { return p.match(haystack) })
}
func (o or) length(haystack string) int {
	match := slice.Find(o.p, func(p predicate) bool { return p.match(haystack) })
	if match == nil {
		return 0
	}
	return (*match).length(haystack)
}

type whitespace struct {
	isSpace func(r rune) bool
}

func Whitespace() whitespace {
	return whitespace{isSpace: unicode.IsSpace}
}

func (w whitespace) match(haystack string) bool {
	rune, _ := utf8.DecodeRuneInString(haystack)
	return w.isSpace(rune)
}
func (w whitespace) length(_ string) int {
	return 1
}

type digit struct {
	isDigit func(r rune) bool
}

func Digit() digit {
	return digit{isDigit: unicode.IsDigit}
}

func (d digit) match(haystack string) bool {
	rune, _ := utf8.DecodeRuneInString(haystack)
	return d.isDigit(rune)
}
func (d digit) length(_ string) int {
	return 1
}

type letter struct {
	isLetter func(r rune) bool
}

func Letter() letter {
	return letter{isLetter: unicode.IsLetter}
}

func (l letter) match(haystack string) bool {
	rune, _ := utf8.DecodeRuneInString(haystack)
	return l.isLetter(rune)
}
func (l letter) length(_ string) int {
	return 1
}
