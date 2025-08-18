package string_view

type StringView struct {
	s      *string
	offset int
	end    int
}

func New(s *string) *StringView {
	return &StringView{s: s, offset: 0, end: len(*s)}
}

func (view *StringView) String() string {
	return (*view.s)[view.offset:view.end]
}

func (view *StringView) Length() int {
	return view.end - view.offset
}

// Seeks the provided predicate in the string.
//
// If the predicate matches the current posision in the string,
// this does nothing
func (view *StringView) Seek(p predicate) *StringView {
	for !p.match((*view.s)[view.offset:]) && view.offset < view.end {
		view.offset++
	}
	return view
}

// Seeks for the provided predicate in the string at any subsequent posision.
func (view *StringView) SeekNext(p predicate) *StringView {
	view.offset++
	for !p.match((*view.s)[view.offset:]) && view.offset < view.end {
		view.offset++
	}
	return view
}

// Seeks the provided predicate in the string.
//
// If the predicate matches the current posision in the string,
// this does nothing
func (view *StringView) SeekEndOf(p predicate) *StringView {
	for !p.match((*view.s)[view.offset:]) && view.offset < view.end {
		view.offset++
	}
	view.offset += p.length((*view.s)[view.offset:])
	return view
}

// Finds and returns the string from the current posision to the location of the
// first match of the predicate.
//
// > Does not advance the offset
//
// As with `StringView.Seek` this will search the current posision too.
// Consequentlely if the predicate matches the current posision, the resulting
// string will be empty.
func (view *StringView) Peak(p predicate) *StringView {
	end := view.offset
	for !p.match((*view.s)[end:]) && end < view.end {
		end++
	}
	return &StringView{s: view.s, offset: view.offset, end: end}
}

// Finds and returns the string from the current posision to the location of the
// next match of the predicate.
//
// > Does not advance the offset
func (view *StringView) PeakNext(p predicate) *StringView {
	end := view.offset + 1
	for !p.match((*view.s)[end:]) && end < view.end {
		end++
	}
	return &StringView{s: view.s, offset: view.offset, end: end}
}

func (view *StringView) Take(n int) *StringView {
	end := min(view.offset+n, view.end)
	result := StringView{s: view.s, offset: view.offset, end: end}
	view.offset = end
	return &result
}

// Finds and returns the string from the current posision to the location of the
// first match of the predicate.
//
// As with `StringView.Seek` this will search the current posision too.
// Consequentlely if the predicate matches the current posision, the resulting
// string will be empty.
func (view *StringView) TakeUntil(p predicate) *StringView {
	end := view.offset
	for !p.match((*view.s)[end:]) && end < view.end {
		end++
	}
	result := StringView{s: view.s, offset: view.offset, end: end}
	view.offset = end
	return &result
}

// Finds and returns the string from the current posision to the location of the
// first match of the predicate.
func (view *StringView) TakeUntilNext(p predicate) *StringView {
	end := view.offset + 1
	for !p.match((*view.s)[end:]) && end < view.end {
		end++
	}
	result := StringView{s: view.s, offset: view.offset, end: end}
	view.offset = end
	return &result
}

// Returns the result of `TakeUntil` any newline character, then `Seek` until
// the next non-empty line
func (view *StringView) TakeLine() *StringView {
	result := view.TakeUntil(Or(String("\n"), String("\r")))
	view.Seek(Not(Or(String("\n"), String("\r"))))
	return result
}

// Trims away any whitespace from the left of the string.
func (view *StringView) TrimLeft() {
	view.Seek(Not(Whitespace()))
}

func (view *StringView) SplitOnNext(p predicate) *StringView {
	first := view.TakeUntil(p)
	view.Seek(Not(p))
	return first
}
