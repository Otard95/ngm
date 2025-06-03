package slice

import (
	"sync"
)

func ParallelMap[T, U any](slice []T, transform func(T, int) U) []U {
	var (
		wg     sync.WaitGroup
		result = make([]U, len(slice))
	)

	wg.Add(len(slice))

	for i := range slice {
		i := i // capture loop variable
		go func() {
			defer wg.Done()
			result[i] = transform(slice[i], i)
		}()
	}

	wg.Wait()
	return result
}
