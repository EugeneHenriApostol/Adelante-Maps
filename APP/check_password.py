# check if passwords are salted

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = "1234"

hashed1 = pwd_context.hash(password)
hashed2 = pwd_context.hash(password)

print("Hash 1:", hashed1)
print("Hash 2:", hashed2)
print("Are they the same?", hashed1 == hashed2)  # prints false
