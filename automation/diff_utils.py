"""
Diff utility for comparing network device configurations.
Provides GitHub-style unified diff with syntax highlighting.
"""
import difflib
import re
from typing import List, Tuple, Dict, Optional
from html import escape


class ConfigDiffGenerator:
    """Generates GitHub-style diffs for network configurations."""

    @staticmethod
    def generate_unified_diff(
        before: str,
        after: str,
        from_file: str = "before.config",
        to_file: str = "after.config",
        context_lines: int = 3
    ) -> str:
        """
        Generate unified diff format between two configurations.

        Args:
            before: Original configuration (precheck)
            after: Modified configuration (postcheck)
            from_file: Name for original file in diff header
            to_file: Name for modified file in diff header
            context_lines: Number of context lines around changes

        Returns:
            Unified diff string
        """
        before_lines = before.splitlines(keepends=True) if before else []
        after_lines = after.splitlines(keepends=True) if after else []

        diff = difflib.unified_diff(
            before_lines,
            after_lines,
            fromfile=from_file,
            tofile=to_file,
            n=context_lines
        )

        return ''.join(diff)

    @staticmethod
    def generate_html_diff(diff_text: str) -> str:
        """
        Convert unified diff to HTML with syntax highlighting.

        Args:
            diff_text: Unified diff string

        Returns:
            HTML string with colored diff
        """
        html_lines = []

        for line in diff_text.splitlines():
            escaped = escape(line)

            if line.startswith('---') or line.startswith('+++'):
                # File header
                html_lines.append(f'<div class="diff-header">{escaped}</div>')
            elif line.startswith('@@'):
                # Position marker
                pos_html = f'<div class="diff-position">{escaped}</div>'
                html_lines.append(pos_html)
            elif line.startswith('+') and not line.startswith('+++'):
                # Addition (green)
                html_lines.append(f'<div class="diff-add">{escaped}</div>')
            elif line.startswith('-') and not line.startswith('---'):
                # Deletion (red)
                html_lines.append(f'<div class="diff-del">{escaped}</div>')
            elif line.startswith(' '):
                # Unchanged context
                html_lines.append(f'<div class="diff-context">{escaped}</div>')
            else:
                # Other lines
                html_lines.append(f'<div class="diff-other">{escaped}</div>')

        return '\n'.join(html_lines)

    @staticmethod
    def generate_line_changes(before: str, after: str) -> Tuple[int, int]:
        """
        Calculate statistics of changes.

        Args:
            before: Original configuration
            after: Modified configuration

        Returns:
            Tuple of (additions_count, deletions_count)
        """
        diff = ConfigDiffGenerator.generate_unified_diff(before, after)

        def count_lines(pattern: str) -> int:
            return sum(
                1 for line in diff.splitlines()
                if line.startswith(pattern)
                and not line.startswith(f'{pattern}{pattern}')
            )

        additions = count_lines('+')
        deletions = count_lines('-')

        return additions, deletions

    @staticmethod
    def parse_config_sections(config: str) -> dict:
        """
        Parse configuration into logical sections.

        Args:
            config: Configuration text

        Returns:
            Dictionary of section_name -> section_content
        """
        sections = {}
        current_section = "default"
        current_content = []

        for line in config.splitlines():
            # Detect section headers (varies by vendor)
            section_pattern = r'^(interface|hostname|username|vlan|router|ip route|!.*)$'
            section_match = re.match(section_pattern, line, re.IGNORECASE)
            if section_match:
                if current_content:
                    sections[current_section] = '\n'.join(current_content)
                current_section = line.strip()
                current_content = [line]
            else:
                current_content.append(line)

        # Don't forget the last section
        if current_content:
            sections[current_section] = '\n'.join(current_content)

        return sections

    @staticmethod
    def generate_side_by_side_diff(
        before: str,
        after: str,
        context_lines: int = 3
    ) -> Dict:
        """
        Generate side-by-side diff view data.

        Args:
            before: Original configuration
            after: Modified configuration
            context_lines: Number of context lines around changes

        Returns:
            Dictionary with left_lines, right_lines, and is_diff flags
        """
        before_lines = before.splitlines() if before else []
        after_lines = after.splitlines() if after else []

        diff = difflib.unified_diff(
            before_lines,
            after_lines,
            fromfile="before.config",
            tofile="after.config",
            n=context_lines
        )

        diff_lines = list(diff)

        left_lines = []
        right_lines = []
        is_diff = []

        skip_prefixes = ('---', '+++', '@@')

        for line in diff_lines:
            if line.startswith(skip_prefixes):
                continue
            elif line.startswith('+') and not line.startswith('+++'):
                left_lines.append('')
                right_lines.append(line[1:])  # Remove + prefix
                is_diff.append(True)
            elif line.startswith('-') and not line.startswith('---'):
                left_lines.append(line[1:])  # Remove - prefix
                right_lines.append('')
                is_diff.append(True)
            elif line.startswith(' '):
                content = line[1:]  # Remove space prefix
                left_lines.append(content)
                right_lines.append(content)
                is_diff.append(False)
            else:
                # Other lines (like file headers), skip them
                continue

        return {
            'left_lines': left_lines,
            'right_lines': right_lines,
            'is_diff': is_diff
        }


def capture_device_config_snapshot(
    device_info: Dict,
    commands: List[str],
    command_results: Optional[Dict] = None
) -> str:
    """
    Capture device configuration snapshot using show commands.

    Args:
        device_info: Device connection info (name, hostname, ip_address, etc.)
        commands: List of show commands to run
        command_results: Optional dict mapping command to output

    Returns:
        Formatted configuration snapshot
    """
    import datetime

    snapshot_lines = []
    snapshot_lines.append(f"! Device: {device_info.get('name', 'Unknown')}")
    snapshot_lines.append(f"! Hostname: {device_info.get('hostname', 'Unknown')}")
    snapshot_lines.append(f"! IP: {device_info.get('ip_address', 'Unknown')}")
    snapshot_lines.append(f"! Vendor: {device_info.get('vendor', 'Unknown')}")
    snapshot_lines.append(f"! Model: {device_info.get('model', 'Unknown')}")
    capture_time = datetime.datetime.now().isoformat()
    snapshot_lines.append(f"! Captured at: {capture_time}")
    snapshot_lines.append("!")
    snapshot_lines.append("! === Configuration Snapshot ===")
    snapshot_lines.append("")

    if command_results:
        for cmd in commands:
            snapshot_lines.append(f"! Command: {cmd}")
            if cmd in command_results:
                result = command_results[cmd]
                if isinstance(result, list):
                    snapshot_lines.extend(result)
                else:
                    snapshot_lines.append(result)
            snapshot_lines.append("!")
    else:
        for cmd in commands:
            snapshot_lines.append(f"! Command: {cmd}")
            snapshot_lines.append("! [Results would be captured here]")
            snapshot_lines.append("")

    return '\n'.join(snapshot_lines)


def generate_config_diff_html(
    pre_check_output: str,
    post_check_output: str
) -> str:
    """
    Generate HTML diff between precheck and postcheck outputs.

    Args:
        pre_check_output: Pre-configuration check output
        post_check_output: Post-configuration check output

    Returns:
        HTML formatted diff string
    """
    diff_text = ConfigDiffGenerator.generate_unified_diff(
        pre_check_output,
        post_check_output,
        from_file="pre_check.config",
        to_file="post_check.config"
    )

    return ConfigDiffGenerator.generate_html_diff(diff_text)


def get_diff_stats(pre_check_output: str, post_check_output: str) -> Dict:
    """
    Get statistics about configuration changes.

    Args:
        pre_check_output: Pre-configuration check output
        post_check_output: Post-configuration check output

    Returns:
        Dictionary with change statistics
    """
    additions, deletions = ConfigDiffGenerator.generate_line_changes(
        pre_check_output,
        post_check_output
    )

    return {
        'additions': additions,
        'deletions': deletions,
        'total_changes': additions + deletions
    }
