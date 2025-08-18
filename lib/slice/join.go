package slice

func Join(slice []string, sep string) string {
	if len(slice) == 0 {
		return ""
	}
	result := slice[0]
	for _, s := range slice[1:] {
		result += sep + s
	}
	return result
}
