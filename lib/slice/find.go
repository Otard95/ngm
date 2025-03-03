package slice

func Find[T any](slice []T, predicate func(T) bool) *T {
	for _, value := range slice {
		if predicate(value) {
			return &value
		}
	}
	return nil
}
