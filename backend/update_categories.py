from app import create_app
from app.models import db, Category
import os
from dotenv import load_dotenv

def setup_categories():
    load_dotenv()
    app = create_app()
    with app.app_context():
        # Clear existing categories completely
        Category.query.delete()
        
        main_categories = {
            'MEN': [
                'Topwear', 'Bottomwear', 'Footwear', 'Sports & Active Wear', 'Innerwear & Sleepwear', 
                'Plus Size', 'Footwear Accessories', 'Personal Care & Grooming', 'Sunglasses & Frames', 
                'Watches', 'Gadgets', 'Bags & Backpacks', 'Luggages & Trolleys',
                # detailed subcategories
                'T-Shirts', 'Casual Shirts', 'Formal Shirts', 'Sweatshirts', 'Sweaters', 'Jackets', 'Blazers & Coats', 'Suits',
                'Jeans', 'Casual Trousers', 'Formal Trousers', 'Shorts', 'Track Pants & Joggers',
                'Casual Shoes', 'Sports Shoes', 'Formal Shoes', 'Sneakers', 'Sandals & Floaters', 'Flip Flops', 'Socks',
                'Briefs & Trunks', 'Boxers', 'Vests', 'Sleepwear & Loungewear', 'Thermals'
            ],
            'WOMEN': [
                'Indian & Fusion Wear', 'Western Wear', 'Maternity', 'Footwear', 'Sports & Active Wear',
                'Lingerie & Sleepwear', 'Beauty & Personal Care', 'Gadgets', 'Jewellery', 'Backpacks',
                'Handbags, Bags & Wallets', 'Luggages & Trolleys', 'Plus Size',
                # detailed subcategories
                'Kurtas & Suits', 'Kurtis, Tunics & Tops', 'Sarees', 'Ethnic Wear', 'Leggings, Salwars & Churidars', 'Skirts & Palazzos', 'Dress Materials', 'Lehenga Cholis', 'Dupattas & Shawls', 'Jackets', 'Belts, Scarves & More', 'Watches & Wearables',
                'Dresses', 'Tops', 'Tshirts', 'Jeans', 'Trousers & Capris', 'Shorts & Skirts', 'Co-ords', 'Playsuits', 'Jumpsuits', 'Shrugs', 'Sweaters & Sweatshirts', 'Jackets & Coats', 'Blazers & Waistcoats',
                'Flats', 'Casual Shoes', 'Heels', 'Boots', 'Sports Shoes & Floaters',
                'Bra', 'Briefs', 'Shapewear', 'Sleepwear & Loungewear', 'Swimwear', 'Camisoles & Thermals',
                'Fashion Jewellery', 'Fine Jewellery', 'Earrings'
            ],
            'KIDS': [
                'Boys Clothing', 'Girls Clothing', 'Footwear', 'Toys & Games', 'Infants', 'Kids Accessories',
                # detailed subcategories
                'T-Shirts', 'Shirts', 'Shorts', 'Jeans', 'Trousers', 'Clothing Sets', 'Ethnic Wear', 'Track Pants & Pyjamas', 'Jacket, Sweater & Sweatshirts',
                'Dresses', 'Tops', 'Lehenga cholis', 'Kurta Suits', 'Party wear', 'Skirts & shorts', 'Tights & Leggings',
                'Casual Shoes', 'Flipflops', 'Sports Shoes', 'Flats', 'Sandals', 'Heeled Shoes', 'School Shoes',
                'Learning & Education', 'Action Figures', 'Soft Toys',
                'Rompers & Onesies', 'Winter Wear', 'Innerwear & Sleepwear',
                'Bags & Backpacks', 'Watches', 'Jewellery & Hair accessory', 'Sunglasses', 'Masks & Protective Gears'
            ],
            'LIVING': [
                'Bed Linen & Furnishing', 'Flooring', 'Bath', 'Lamps & Lighting', 'Home Décor', 'Kitchen & Table', 'Storage',
                # detailed subcategories
                'Bed Runners', 'Mattress Protectors', 'Bedsheets', 'Bedding Sets', 'Blankets, Quilts & Dohars', 'Pillows & Pillow Covers', 'Bed Covers',
                'Floor Runners', 'Carpets', 'Floor Mats & Dhurries', 'Door Mats',
                'Bath Towels', 'Hand & Face Towels', 'Beach Towels', 'Towel Set', 'Bath Rugs', 'Bath Robes', 'Bathroom Accessories',
                'Floor Lamps', 'Ceiling Lamps', 'Table Lamps', 'Wall Lamps', 'Outdoor Lamps', 'String Lights',
                'Plants & Planters', 'Aromas & Candles', 'Clocks', 'Mirrors', 'Wall Décor', 'Festive Decor', 'Pooja Essentials', 'Wall Shelves', 'Fountains', 'Showpieces & Vases', 'Ottoman',
                'Table Runners', 'Dinnerware & Serveware', 'Cups and Mugs', 'Bakeware & Cookware', 'Kitchen Storage & Tools', 'Bar & Drinkware', 'Table Covers & Furnishings',
                'Bins', 'Hangers', 'Organisers', 'Hooks & Dispensers'
            ],
            'COSMETICS': [
                'Makeup', 'Skincare, Bath & Body', 'Haircare', 'Fragrances', 'Appliances', 'Men\'s Grooming', 'Beauty Gift & Makeup Set', 'Premium Beauty', 'Wellness & Hygiene',
                # detailed subcategories
                'Lipstick', 'Lip Gloss', 'Lip Liner', 'Mascara', 'Eyeliner', 'Kajal', 'Eyeshadow', 'Foundation', 'Primer', 'Concealer', 'Compact', 'Nail Polish',
                'Face Cleanser', 'Toner', 'Face Wash', 'Makeup Remover', 'Lip Balm', 'Body Lotion', 'Body Wash', 'Body Scrub', 'Hand Cream', 'Baby Care', 'Masks & Peels', 'Sunscreen', 'Serum', 'Face Cream', 'Neck Cream',
                'Shampoo', 'Conditioner', 'Hair Cream', 'Hair Oil', 'Hair Gel', 'Hair Color', 'Hair Serum', 'Hair Accessory',
                'Perfume', 'Deodorant', 'Body Mist',
                'Hair Straightener', 'Hair Dryer', 'Epilator',
                'Trimmers', 'Beard Oil', 'Hair Wax'
            ]
        }
        
        for main_name, subs in main_categories.items():
            main_cat = Category(name=main_name, parent_id=None)
            db.session.add(main_cat)
            db.session.flush() # get ID
            
            # Deduplicate just in case
            unique_subs = list(dict.fromkeys(subs))
            
            for sub_name in unique_subs:
                sub_cat = Category(name=sub_name, parent_id=main_cat.id)
                db.session.add(sub_cat)
                
        db.session.commit()
        print("Categories updated successfully with comprehensive Myntra-like lists!")

if __name__ == '__main__':
    setup_categories()
