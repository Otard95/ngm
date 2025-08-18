package slice

func Concat[T any](slices ...[]T) []T {
	var out []T
	for _, slice := range slices {
		out = append(out, slice...)
	}
	return out
}
