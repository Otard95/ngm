package string_view

import (
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestStringPredicate(t *testing.T) {

	{
		s := " a!bcdefg"

		view := New(&s)

		view.SeekEndOf(String("c"))

		assert.Equal(t, "defg", view.String(), "the view should be equal")
		assert.Equal(t, 5, view.offset, "the offset should equal")
	}

}
