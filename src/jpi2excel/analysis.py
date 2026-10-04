# Copyright © 2025-2026 by Alan M. Marcum, Nescorna Professional.
# All rights reserved.
"""Revision: 1. Explainable observations against recorded limits, not diagnoses."""
import math

from .export import alarm_category, label, units
from .model import ConversionError


def analyze_flight(flight, download, minimum_seconds=10):
    """Report contiguous at-limit spans and missing channels.

    Duration is last minus first observed timestamp, never an assumed interval
    beyond the final sample. Missing values break a span. No flight-phase or
    manufacturer-limit inference is made.
    """
    if not math.isfinite(minimum_seconds) or minimum_seconds < 0:
        raise ConversionError('Minimum event duration must be finite and nonnegative')
    findings = []
    for code, values in flight.series.items():
        common = {'sensor': code, 'label': label(code, flight), 'unit': units(code, download)}
        if not any(value is not None for value in values):
            findings.append({**common, 'rule': 'missing-channel-v1', 'kind': 'data quality',
                             'start': 0, 'end': flight.duration, 'duration': flight.duration,
                             'peak': None, 'threshold': None,
                             'message': 'Declared channel has no decoded readings.'})
            continue
        low, high = download.alarms.get(alarm_category(code), (None, None))
        for direction, threshold in [('low', low), ('high', high)]:
            if threshold is None:
                continue
            start = None
            peak = None
            for index in range(len(values) + 1):
                value = values[index] if index < len(values) else None
                hit = value is not None and (value <= threshold if direction == 'low' else value >= threshold)
                if hit:
                    if start is None:
                        start, peak = index, value
                    else:
                        peak = min(peak, value) if direction == 'low' else max(peak, value)
                elif start is not None:
                    first, last = flight.elapsed[start], flight.elapsed[index - 1]
                    if last - first >= minimum_seconds:
                        findings.append({**common, 'rule': 'recorded-limit-v1', 'kind': direction + ' limit',
                                         'start': first, 'end': last, 'duration': last - first,
                                         'peak': peak, 'threshold': threshold,
                                         'message': f'At or beyond recorded {direction} alarm for {last - first} seconds.'})
                    start = peak = None
    return sorted(findings, key=lambda item: (item['start'], item['sensor'], item['kind']))
