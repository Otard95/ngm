package ui

import "github.com/charmbracelet/lipgloss"

const (
	ColorRosewater = lipgloss.Color("#f2d5cf")
	ColorFlamingo  = lipgloss.Color("#eebebe")
	ColorPink      = lipgloss.Color("#f4b8e4")
	ColorMauve     = lipgloss.Color("#ca9ee6")
	ColorRed       = lipgloss.Color("#e78284")
	ColorMaroon    = lipgloss.Color("#ea999c")
	ColorPeach     = lipgloss.Color("#ef9f76")
	ColorYellow    = lipgloss.Color("#e5c890")
	ColorGreen     = lipgloss.Color("#a6d189")
	ColorTeal      = lipgloss.Color("#81c8be")
	ColorSky       = lipgloss.Color("#99d1db")
	ColorSapphire  = lipgloss.Color("#85c1dc")
	ColorBlue      = lipgloss.Color("#8caaee")
	ColorLavender  = lipgloss.Color("#babbf1")
	ColorText      = lipgloss.Color("#c6d0f5")
	ColorSubtext1  = lipgloss.Color("#b5bfe2")
	ColorSubtext0  = lipgloss.Color("#a5adce")
	ColorOverlay2  = lipgloss.Color("#949cbb")
	ColorOverlay1  = lipgloss.Color("#838ba7")
	ColorOverlay0  = lipgloss.Color("#737994")
	ColorSurface2  = lipgloss.Color("#626880")
	ColorSurface1  = lipgloss.Color("#51576d")
	ColorSurface0  = lipgloss.Color("#414559")
	ColorBase      = lipgloss.Color("#303446")
	ColorMantle    = lipgloss.Color("#292c3c")
	ColorCrust     = lipgloss.Color("#232634")
)

var (
	SuccessStyle = lipgloss.NewStyle().Foreground(ColorGreen)
	ErrorStyle   = lipgloss.NewStyle().Foreground(ColorRed)
)
