import os
import re
import yaml
import argparse
import requests
import hashlib
import logging
import random
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from SyntheticDataGeneration.Utils import Utils

class FileManager:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir

    def find_file(self, relative_path: str) -> Optional[Path]:
        possible_path = self.base_dir / relative_path
        if possible_path.exists():
            return possible_path
        target_name = Path(relative_path).name
        for path in self.base_dir.rglob(target_name):
            if path.is_file():
                return path
        return None

    def read_text(self, file_path: Path) -> str:
        return file_path.read_text(encoding="utf-8")

    def write_text(self, file_path: Path, text: str) -> None:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(text, encoding="utf-8")

    def build_files_content(self, file_list: List[str], file_header_template: str) -> str:
        combined = ""
        for rel_path in file_list:
            file_path = self.find_file(rel_path)
            if file_path and file_path.exists():
                content = self.read_text(file_path)
                combined += file_header_template.format(file_name=rel_path) + "\n"
                combined += content + "\n\n"
            else:
                Utils.logger.warning(f"{rel_path} not found in {self.base_dir} or its subdirectories.")
        return combined