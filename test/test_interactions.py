import unittest
from models.user import User
from services.interaction import process_interaction

class TestUserInteractions(unittest.TestCase):
    def test_item_reception(self):
        user1 = User("Player1", 101)
        user2 = User("Player2", 102)
        
        process_interaction(user1, user2)
        
        # Check that user1 received an item
        self.assertGreater(len(user1.item_bag), 0)
        self.assertTrue(any(item.item_type in ['boost', 'team'] for item in user1.item_bag))

if __name__ == '__main__':
    unittest.main()