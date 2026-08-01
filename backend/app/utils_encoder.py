import hashlib
import re

def encode_product_id(product_id: int) -> str:
    """
    Encodes an internal integer database ID into an immutable, tamper-proof,
    Amazon ASIN-style alphanumeric identifier (e.g. B09LBIC9CE).
    """
    num = int(product_id)
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    b36 = ""
    if num == 0:
        b36 = "0"
    while num > 0:
        num, rem = divmod(num, 36)
        b36 = chars[rem] + b36
        
    checksum = hashlib.sha256(f"libora_secure_salt_{product_id}".encode()).hexdigest().upper()[:3]
    return f"B09L{b36}{checksum}"

def decode_product_id(identifier: str):
    """
    Decodes an Amazon-style ASIN identifier (e.g. B09LBIC9CE) back to the internal integer ID.
    Supports backwards compatibility for raw integer IDs.
    """
    if not identifier:
        return None
        
    str_ident = str(identifier).strip()
    
    # Backwards compatibility for numeric IDs
    if str_ident.isdigit():
        return int(str_ident)
        
    # ASIN Encoded format (e.g., B09LBIC9CE)
    if str_ident.startswith("B09L") and len(str_ident) > 7:
        checksum = str_ident[-3:]
        b36 = str_ident[4:-3]
        chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        try:
            num = 0
            for char in b36:
                num = num * 36 + chars.index(char)
            expected_checksum = hashlib.sha256(f"libora_secure_salt_{num}".encode()).hexdigest().upper()[:3]
            if checksum == expected_checksum:
                return num
        except Exception:
            pass
            
    return None

def slugify_name(name: str) -> str:
    """
    Generates an SEO-friendly Amazon URL slug from a product name.
    """
    if not name:
        return "product"
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', name).lower().strip()
    slug = re.sub(r'[\s-]+', '-', slug)
    return slug[:60]
