import io

# Create a BytesIO object with some binary data
data = io.BytesIO(b"Hello, world!")

# Read from the stream
print(data.read())    # Output: b'Hello, world!'

# Reset the cursor to the beginning
data.seek(0)

# Write new data
data.write(b"Pythonasd")

# Reset and read again
data.seek(0)
print(data.read())    
