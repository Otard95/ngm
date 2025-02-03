package slice

func Some[T any](slice []T, predicate func(T) bool) bool {
	for _, value := range slice {
		if predicate(value) {
			return true
		}
	}
	return false
}
