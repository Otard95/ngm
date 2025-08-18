package slice

func Map[T, U any](slice []T, transform func(T, int) U) []U {
	result := make([]U, len(slice))
	for i := range slice {
		result[i] = transform(slice[i], i)
	}
	return result
}
