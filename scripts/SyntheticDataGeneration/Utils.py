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

# --- Utility Class ---
class Utils:

    # Configure the logger at the class level
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    logger = logging.getLogger(__name__)

    @staticmethod
    def get_item_by_name(item_list: List[Dict[str, Any]], name: str) -> Optional[Dict[str, Any]]:
        for obj in item_list:
            if obj.get("name") == name:
                return obj
        return None

    @staticmethod
    def get_hash(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()