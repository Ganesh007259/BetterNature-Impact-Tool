from app.scoring import coverage_gap, normalized_population, priority_score


def test_coverage_gap_full_when_no_activity() -> None:
    assert coverage_gap(0.8, 0.0) == 0.8


def test_coverage_gap_reduces_with_activity() -> None:
    g = coverage_gap(0.8, 0.5)
    assert g < 0.8
    assert g == 0.8 * 0.5


def test_normalized_population_clamped() -> None:
    assert 0 <= normalized_population(1000) <= 1
    assert normalized_population(0) >= 0


def test_priority_score_in_range() -> None:
    s = priority_score(0.7, 0.5, 0.6, 0.5)
    assert 0 <= s <= 100
