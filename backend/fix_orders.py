import os

file_path = r"C:\Users\geeta\.gemini\antigravity-ide\scratch\ai-marketplace\backend\app\routes\orders.py"

with open(file_path, "r") as f:
    content = f.read()

# Fix buyer coin reward
old_buyer_reward = """        # Award coins (1 coin per 100 spent)
        coins_earned = int(total_amount / 100)"""
new_buyer_reward = """        # Award coins (5 coins per 100 spent)
        coins_earned = int((total_amount * 5) / 100)"""
content = content.replace(old_buyer_reward, new_buyer_reward)


# Fix seller coin reward
old_status_logic = """    # 2. Subtract price from seller total earnings if return is completed
    if new_status == 'Returned' and old_status != 'Returned':
        for item in order.items:
            product = db.session.get(Product, item.product_id)
            if product:
                seller = db.session.get(Seller, product.seller_id)
                if seller:
                    seller.total_sales = max(0.0, seller.total_sales - (item.price * item.quantity))
                    
    order.status = new_status"""

new_status_logic = """    # 2. Subtract price from seller total earnings if return is completed
    if new_status == 'Returned' and old_status != 'Returned':
        for item in order.items:
            product = db.session.get(Product, item.product_id)
            if product:
                seller = db.session.get(Seller, product.seller_id)
                if seller:
                    seller.total_sales = max(0.0, seller.total_sales - (item.price * item.quantity))
                    
    # 3. Award Style Coins to seller when order is delivered
    if new_status == 'Delivered' and old_status != 'Delivered':
        for item in order.items:
            product = db.session.get(Product, item.product_id)
            if product:
                seller = db.session.get(Seller, product.seller_id)
                if seller and seller.user:
                    # Award 1% of the item total in Style Coins
                    coins_earned = int((item.price * item.quantity) / 100)
                    seller.user.coins += coins_earned
                    
    order.status = new_status"""
content = content.replace(old_status_logic, new_status_logic)

with open(file_path, "w") as f:
    f.write(content)

print("Fixed orders.py")
