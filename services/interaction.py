from models.user import User, Item

def process_interaction(user, other_user):
    current_time = time.time()
    
    if current_time - user.last_interaction_time < 30:
        print(f"{user.username} needs to wait before interacting again.")
        return
    
    user.receive_item()
    user.last_interaction_time = current_time
    print(f"Interaction complete: {user.username} and {other_user.username}")