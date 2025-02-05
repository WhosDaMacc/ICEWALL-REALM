from flask import Flask, request, jsonify
from models.user import User
from services.interaction import process_interaction

app = Flask(__name__)

@app.route('/interact', methods=['POST'])
def interact():
    user_id = request.json['user_id']
    other_user_id = request.json['other_user_id']
    
    # Example: Retrieve users from DB (mocked for simplicity)
    user = User(username=f"User{user_id}", user_id=user_id)
    other_user = User(username=f"User{other_user_id}", user_id=other_user_id)
    
    process_interaction(user, other_user)
    return jsonify({"message": "Interaction complete", "items": [str(item) for item in user.item_bag]})

if __name__ == '__main__':
    app.run(debug=True)