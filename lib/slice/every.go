package slice

func Every[T any](slice []T, predicate func(T) bool) bool {
	return !Some(slice, func(value T) bool { return !predicate(value) })
}
