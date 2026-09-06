"""Canonical NHL season-range validation shared by jobs and audits."""


def season_ids_in_range(start_season: int, end_season: int) -> list[int]:
    """Return consecutive NHL season identifiers, inclusive."""
    start_year = _start_year(start_season)
    end_year = _start_year(end_season)
    if end_year < start_year:
        raise ValueError("end_season must not be earlier than start_season")
    return [year * 10_000 + year + 1 for year in range(start_year, end_year + 1)]


def _start_year(season_id: int) -> int:
    start_year, end_year = divmod(season_id, 10_000)
    if start_year < 1900 or end_year != start_year + 1:
        raise ValueError("season IDs must use NHL format YYYYYYYY, such as 20052006")
    return start_year
