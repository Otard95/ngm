package slice

func Filter[T any](slice []T, predicate func(T, int) bool) []T {
	result := []T{}
	for i, v := range slice {
		if predicate(v, i) {
			result = append(result, v)
		}
	}
	return result
}
