from app import create_app, db
from app.models import Category

def add_electronics():
    app = create_app()
    with app.app_context():
        # Check if ELECTRONICS exists
        if Category.query.filter_by(name='ELECTRONICS').first():
            print("ELECTRONICS already exists!")
            return

        electronics = Category(name='ELECTRONICS')
        db.session.add(electronics)
        db.session.commit()

        sub_cats = {
            'Mobiles': ['Smartphones', 'Feature Phones', 'Mobile Accessories'],
            'Laptops & Computers': ['Laptops', 'Desktops', 'Monitors', 'PC Components'],
            'Audio': ['Headphones', 'Earbuds', 'Speakers', 'Soundbars'],
            'Wearables': ['Smartwatches', 'Fitness Bands', 'VR Headsets'],
            'Cameras': ['DSLR', 'Mirrorless', 'Action Cameras', 'Camera Accessories'],
            'Home Appliances': ['Televisions', 'Washing Machines', 'Refrigerators', 'Air Conditioners']
        }

        for group_name, subs in sub_cats.items():
            group_cat = Category(name=group_name, parent_id=electronics.id)
            db.session.add(group_cat)
            db.session.commit()
            
            for sub_name in subs:
                sub_cat = Category(name=sub_name, parent_id=group_cat.id)
                db.session.add(sub_cat)
                
        db.session.commit()
        print("Electronics categories added successfully!")

if __name__ == '__main__':
    add_electronics()
