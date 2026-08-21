import torch

print("CUDA Available:", torch.cuda.is_available())
print("PyTorch CUDA Version:", torch.version.cuda)
print("Device Count:", torch.cuda.device_count())

if torch.cuda.is_available():
    print("Device Name:", torch.cuda.get_device_name(0))