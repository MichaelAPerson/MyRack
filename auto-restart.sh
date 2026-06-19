Run:

wget https://raw.githubusercontent.com/MichaelAPerson/MyRack/main/agent/myrack-agent.service.example
Step 2: rename it
mv myrack-agent.service.example myrack-agent.service
Step 3: install systemd service
sudo cp myrack-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable myrack-agent
sudo systemctl start myrack-agent
Step 4: verify
systemctl status myrack-agent
