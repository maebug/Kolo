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

class TextParser:
    @staticmethod
    def parse_questions(question_text: str) -> List[str]:
        questions = []
        for line in question_text.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            cleaned = re.sub(r'^[\d\.\-\+\*]+\s*', '', stripped)
            cleaned = re.sub(r'\*+', '', cleaned).strip()
            if '?' in cleaned:
                questions.append(cleaned)
        return questions