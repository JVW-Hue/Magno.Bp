import pygame
import random
import math
import time
import json
import os
import socket
import webbrowser

pygame.init()

# Ad Smart Link
AD_LINK = "https://www.effectivegatecpm.com/ehtjvsm8a?key=a81e51f36bc8eba806fbf695f06bd3f8"

def check_internet():
    """Check if internet connection is available"""
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        return False

WIDTH, HEIGHT = 400, 800
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Magno.bp")
clock = pygame.time.Clock()

LANE_WIDTH = WIDTH // 3
LANES = [LANE_WIDTH // 2, WIDTH // 2, WIDTH - LANE_WIDTH // 2]

MAGNET_TIERS = [
    {"name": "Tiny", "color": (100, 150, 255), "radius": 40},
    {"name": "Double", "color": (50, 100, 255), "radius": 60},
    {"name": "Swift", "color": (0, 200, 255), "radius": 80},
    {"name": "Shield", "color": (150, 255, 150), "radius": 100},
    {"name": "Cosmic", "color": (255, 100, 255), "radius": 120}
]

LEADER_NAMES = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", 
                "Skyler", "Dakota", "Phoenix", "River", "Sage", "Rowan", "Blake", "Cameron"]

OBSTACLE_TYPES = [
    {"color": (255, 50, 50), "shape": "box"},
    {"color": (255, 100, 0), "shape": "spike"},
    {"color": (200, 0, 100), "shape": "wall"},
]

BALL_SKINS = [
    {"name": "Classic", "cost": 0, "colors": [(100, 150, 255), (50, 100, 255)], "trail": (100, 150, 255), "effect": "none"},
    {"name": "Fire", "cost": 150, "colors": [(255, 100, 0), (255, 50, 0)], "trail": (255, 150, 0), "effect": "fire"},
    {"name": "Toxic", "cost": 400, "colors": [(0, 255, 100), (0, 200, 50)], "trail": (0, 255, 100), "effect": "toxic"},
    {"name": "Galaxy", "cost": 800, "colors": [(150, 0, 255), (100, 0, 200)], "trail": (150, 0, 255), "effect": "galaxy"},
    {"name": "Gold", "cost": 1500, "colors": [(255, 215, 0), (255, 180, 0)], "trail": (255, 215, 0), "effect": "gold"},
    {"name": "Diamond", "cost": 3000, "colors": [(200, 255, 255), (150, 200, 255)], "trail": (200, 255, 255), "effect": "diamond"},
]

class Player:
    def __init__(self, skin_id=0):
        self.lane = 1
        self.y = HEIGHT // 2
        self.tier = 0
        self.orbs = []
        self.speed = 5
        self.holding = False
        self.distance = 0
        self.anim = 0
        self.skin = BALL_SKINS[skin_id]
        self.target_lane = 1
        self.lane_transition = 0
        self.squash = 1.0
        self.trail_particles = []
        
    def draw(self):
        # Smooth lane transition
        if self.lane != self.target_lane:
            self.lane_transition += 0.2
            if self.lane_transition >= 1.0:
                self.lane = self.target_lane
                self.lane_transition = 0
        
        current_x = LANES[self.lane]
        if self.lane_transition > 0:
            target_x = LANES[self.target_lane]
            current_x = current_x + (target_x - current_x) * self.lane_transition
        
        self.anim += 0.1
        self.squash = max(0.9, self.squash - 0.05)
        
        color1, color2 = self.skin["colors"]
        trail_color = self.skin["trail"]
        
        # Trail particles
        if self.holding:
            self.trail_particles.append({"x": current_x, "y": self.y, "life": 20, "color": trail_color})
        
        # Draw and update trail
        for particle in self.trail_particles[:]:
            particle["life"] -= 1
            alpha = int(255 * (particle["life"] / 20))
            if particle["life"] <= 0:
                self.trail_particles.remove(particle)
            else:
                size = int(10 * (particle["life"] / 20))
                pygame.draw.circle(screen, particle["color"], (int(particle["x"]), particle["y"]), size)
        
        # Squash and stretch effect
        width = int(20 * self.squash)
        height = int(20 / self.squash)
        
        # Glow effect based on skin
        glow_size = 25 + math.sin(self.anim) * 2
        pygame.draw.circle(screen, color1, (int(current_x), self.y), int(glow_size))
        
        # Main body with squash
        pygame.draw.ellipse(screen, color1, (int(current_x) - width, self.y - height, width * 2, height * 2))
        pygame.draw.ellipse(screen, color2, (int(current_x) - width + 5, self.y - height + 5, width * 2 - 10, height * 2 - 10))
        
        # Eyes
        pygame.draw.circle(screen, (255, 255, 255), (int(current_x) - 6, self.y - 5), 4)
        pygame.draw.circle(screen, (255, 255, 255), (int(current_x) + 6, self.y - 5), 4)
        pygame.draw.circle(screen, (0, 0, 0), (int(current_x) - 6, self.y - 5), 2)
        pygame.draw.circle(screen, (0, 0, 0), (int(current_x) + 6, self.y - 5), 2)
        
        # Smile
        pygame.draw.arc(screen, (255, 255, 255), (int(current_x) - 8, self.y - 2, 16, 12), 3.14, 6.28, 2)
        
        # Magnetic field when holding
        if self.holding:
            tier_data = MAGNET_TIERS[self.tier]
            for i in range(2):
                radius = tier_data["radius"] - i * 30
                pygame.draw.circle(screen, color1, (int(current_x), self.y), radius, 1)
    
    def move_lane(self, direction):
        new_lane = max(0, min(2, self.target_lane + direction))
        if new_lane != self.target_lane:
            self.target_lane = new_lane
            self.lane_transition = 0.01
            self.squash = 1.3
    
    def collect_orb(self, orb):
        self.orbs.append(orb.tier)
        self.orbs.sort()
        self.check_merge()
    
    def check_merge(self):
        for tier in range(5):
            if self.orbs.count(tier) >= 3:
                for _ in range(3):
                    self.orbs.remove(tier)
                if tier < 4:
                    self.orbs.append(tier + 1)
                    self.tier = max(self.tier, tier + 1)
                return True
        return False



class Orb:
    def __init__(self, lane, y, tier=0):
        self.lane = lane
        self.y = y
        self.tier = tier
        self.collected = False
        self.anim = random.uniform(0, 6.28)
        self.bounce_offset = random.uniform(0, 6.28)
    
    def draw(self, offset):
        y = self.y - offset
        if -50 < y < HEIGHT + 50:
            x = LANES[self.lane]
            color = MAGNET_TIERS[self.tier]["color"]
            self.anim += 0.15
            self.bounce_offset += 0.1
            
            # Bounce effect
            bounce_y = y + math.sin(self.bounce_offset) * 3
            
            # Glow
            glow_size = 15 + math.sin(self.anim) * 2
            pygame.draw.circle(screen, color, (x, int(bounce_y)), int(glow_size))
            
            # Main orb
            pygame.draw.circle(screen, color, (x, int(bounce_y)), 12)
            pygame.draw.circle(screen, (255, 255, 255), (x, int(bounce_y)), 12, 2)
            
            # Sparkle
            sparkle_size = 3 + math.sin(self.anim * 2) * 1
            pygame.draw.circle(screen, (255, 255, 255), (x + 5, int(bounce_y) - 5), int(sparkle_size))

class Obstacle:
    def __init__(self, lane, y, level):
        self.lane = lane
        self.y = y
        self.hit = False
        self.anim = random.uniform(0, 6.28)
        self.type = OBSTACLE_TYPES[min(level // 5, len(OBSTACLE_TYPES) - 1)]
        self.shake = 0
    
    def draw(self, offset):
        y = self.y - offset
        if -50 < y < HEIGHT + 50:
            x = LANES[self.lane]
            self.anim += 0.1
            self.shake = max(0, self.shake - 1)
            
            shake_x = x + (random.randint(-2, 2) if self.shake > 0 else 0)
            size = 25
            
            # Shadow
            pygame.draw.ellipse(screen, (0, 0, 0, 50), (shake_x - size - 5, int(y) + size, size * 2 + 10, 10))
            
            if self.type["shape"] == "box":
                # Pulsing danger effect
                pulse = int(math.sin(self.anim * 2) * 10)
                pygame.draw.rect(screen, self.type["color"], (shake_x - size, int(y) - size, size * 2, size * 2))
                pygame.draw.rect(screen, (255, 200 + pulse, 0), (shake_x - size + 5, int(y) - size + 5, size * 2 - 10, size * 2 - 10), 2)
                pygame.draw.polygon(screen, (255, 255, 255), [(shake_x, int(y) - 12), (shake_x - 10, int(y) + 8), (shake_x + 10, int(y) + 8)])
            elif self.type["shape"] == "spike":
                pygame.draw.polygon(screen, self.type["color"], [(shake_x, int(y) - 30), (shake_x - 20, int(y) + 20), (shake_x + 20, int(y) + 20)])
                pygame.draw.polygon(screen, (255, 150, 0), [(shake_x, int(y) - 25), (shake_x - 15, int(y) + 15), (shake_x + 15, int(y) + 15)], 2)
            else:
                pygame.draw.rect(screen, self.type["color"], (shake_x - 30, int(y) - 15, 60, 30))
                pygame.draw.rect(screen, (255, 200, 0), (shake_x - 28, int(y) - 13, 56, 26), 2)

class SaveData:
    def __init__(self):
        self.file = "save.json"
        self.data = self.load()
    
    def load(self):
        if os.path.exists(self.file):
            with open(self.file, 'r') as f:
                return json.load(f)
        return {"name": "", "level": 1, "tokens": 0, "owned_skins": [0], "current_skin": 0}
    
    def save(self):
        with open(self.file, 'w') as f:
            json.dump(self.data, f)

class Leaderboard:
    def __init__(self):
        self.file = "leaderboard.json"
        self.data = self.load()
    
    def load(self):
        if os.path.exists(self.file):
            with open(self.file, 'r') as f:
                return json.load(f)
        return {"last_update": 0, "entries": [], "persistent": []}
    
    def save(self):
        with open(self.file, 'w') as f:
            json.dump(self.data, f)
    
    def update(self, player_name, player_level):
        current_day = int(time.time() / 86400)
        if self.data["last_update"] != current_day:
            self.data["last_update"] = current_day
            if self.data["entries"]:
                keep = random.sample(self.data["entries"], min(3, len(self.data["entries"])))
                self.data["persistent"] = keep
            new_entries = []
            for i in range(7):
                name = random.choice(LEADER_NAMES)
                level = player_level + random.randint(-2, 5)
                new_entries.append({"name": name, "level": max(1, level)})
            self.data["entries"] = self.data["persistent"] + new_entries
            self.save()
        
        all_entries = self.data["entries"].copy()
        if player_name:
            all_entries.append({"name": player_name, "level": player_level})
        sorted_entries = sorted(all_entries, key=lambda x: x["level"], reverse=True)
        
        player_rank = None
        if player_name:
            for i, entry in enumerate(sorted_entries):
                if entry["name"] == player_name and entry["level"] == player_level:
                    player_rank = i + 1
                    break
        
        return sorted_entries[:10], player_rank

class Game:
    def __init__(self, save_data):
        self.save = save_data
        self.player = Player(self.save.data["current_skin"])
        self.orbs = []
        self.obstacles = []
        self.level = self.save.data["level"]
        self.tokens_earned = 0
        self.finish_line = 4000 + self.level * 500
        self.base_speed = 5 + self.level * 0.3
        self.game_over = False
        self.won = False
        self.font = pygame.font.Font(None, 36)
        self.small_font = pygame.font.Font(None, 24)
        self.show_ad = False
        self.ad_timer = 0
        self.ad_loading = False
        self.leaderboard = Leaderboard()
        self.show_leaderboard = False
        self.show_shop = False
        self.paused = False
        self.show_resume_button = False
        self.anim = 0
        self.no_internet = False
        self.internet_check_timer = 0
        
        # Smart level generation
        self.generate_level()
    
    def generate_level(self):
        # Generate orbs in safe positions
        orb_positions = []
        for i in range(100):
            y_pos = i * 100 + 200
            lane = random.randint(0, 2)
            orb_positions.append((lane, y_pos))
            self.orbs.append(Orb(lane, y_pos, random.randint(0, min(2, self.level // 5))))
        
        # Generate obstacles with smart placement
        obstacle_rows = []
        obstacle_density = min(50, 30 + self.level * 2)
        
        for i in range(obstacle_density):
            spawn_y = random.randint(1200, self.finish_line - 500)
            
            # Ensure minimum spacing between obstacles
            too_close = any(abs(spawn_y - row_y) < 150 for row_y in obstacle_rows)
            if too_close:
                continue
            
            obstacle_rows.append(spawn_y)
            
            # Randomly block 1 or 2 lanes, NEVER all 3
            num_blocked = random.randint(1, 2)
            blocked_lanes = random.sample([0, 1, 2], num_blocked)
            
            # Check if any orbs are near this position
            for lane in blocked_lanes:
                # Check if orb exists within danger zone
                orb_conflict = any(
                    orb_lane == lane and abs(orb_y - spawn_y) < 100
                    for orb_lane, orb_y in orb_positions
                )
                
                # Only place obstacle if no orb conflict
                if not orb_conflict:
                    self.obstacles.append(Obstacle(lane, spawn_y, self.level))
    
    def update(self):
        # Always update animation timer
        self.anim += 0.05
        
        # Check internet connection every 60 frames (1 second)
        self.internet_check_timer += 1
        if self.internet_check_timer >= 60:
            self.internet_check_timer = 0
            self.no_internet = not check_internet()
            if self.no_internet:
                print("[NETWORK] No internet connection detected")
        
        # Don't update if no internet
        if self.no_internet:
            return
        
        # Don't update gameplay if paused or in menus
        if self.paused or self.show_shop or self.show_leaderboard or self.show_resume_button:
            return
        
        # Handle ad timer countdown even when game over
        if self.game_over and self.show_ad:
            if self.ad_timer > 0:
                self.ad_timer -= 1
            else:
                self.show_ad = False
                print(f"[AD] Ad timer completed")
            return
        
        if self.game_over:
            return
        
        speed = self.base_speed
        if self.player.holding:
            self.player.distance += speed
        else:
            self.player.distance += speed * 0.6
        
        pull_radius = MAGNET_TIERS[self.player.tier]["radius"] if self.player.holding else 30
        
        for orb in self.orbs:
            if not orb.collected and orb.lane == self.player.lane:
                dist = abs(orb.y - self.player.distance - self.player.y)
                if dist < pull_radius:
                    orb.collected = True
                    self.player.collect_orb(orb)
                    self.player.squash = 1.2
        
        for obs in self.obstacles:
            if not obs.hit and obs.lane == self.player.lane:
                dist = abs(obs.y - self.player.distance - self.player.y)
                if dist < 40:
                    obs.hit = True
                    obs.shake = 10
                    self.player.squash = 0.6
                    # Always crash on red block collision
                    self.game_over = True
                    self.show_ad = True
                    self.ad_timer = 180
                    # Open ad in browser
                    print(f"[AD] Player crashed - Opening ad in browser")
                    try:
                        webbrowser.open(AD_LINK)
                        print(f"[AD] Crash ad opened: {AD_LINK}")
                    except Exception as e:
                        print(f"[AD] Failed to open crash ad: {e}")
        
        if self.player.distance >= self.finish_line:
            self.won = True
            self.game_over = True
            # Always show ad after winning
            self.show_ad = True
            self.ad_timer = 180
            # Progressive token earnings: 10 + level * 5 (scales nicely)
            self.tokens_earned = 10 + self.level * 5
            self.save.data["tokens"] += self.tokens_earned
            self.save.data["level"] = max(self.save.data["level"], self.level + 1)
            self.save.save()
            # Open ad in browser
            print(f"[AD] Level {self.level} completed - Opening ad in browser")
            try:
                webbrowser.open(AD_LINK)
                print(f"[AD] Win ad opened: {AD_LINK}")
            except Exception as e:
                print(f"[AD] Failed to open win ad: {e}")
    
    def draw(self):
        screen.fill((20, 20, 40))
        
        # No internet warning overlay
        if self.no_internet:
            overlay = pygame.Surface((WIDTH, HEIGHT))
            overlay.set_alpha(240)
            overlay.fill((0, 0, 0))
            screen.blit(overlay, (0, 0))
            
            # Warning icon
            pygame.draw.circle(screen, (255, 200, 0), (WIDTH // 2, HEIGHT // 2 - 80), 40)
            pygame.draw.circle(screen, (0, 0, 0), (WIDTH // 2, HEIGHT // 2 - 80), 35)
            warning_text = self.font.render("!", True, (255, 200, 0))
            screen.blit(warning_text, (WIDTH // 2 - 8, HEIGHT // 2 - 95))
            
            title = self.font.render("⚠️ NO INTERNET ⚠️", True, (255, 100, 100))
            screen.blit(title, (WIDTH // 2 - 130, HEIGHT // 2 - 20))
            
            msg1 = self.small_font.render("Internet connection required", True, (255, 255, 255))
            screen.blit(msg1, (WIDTH // 2 - 110, HEIGHT // 2 + 30))
            
            msg2 = self.small_font.render("Please turn on Wi-Fi to continue", True, (200, 200, 200))
            screen.blit(msg2, (WIDTH // 2 - 120, HEIGHT // 2 + 60))
            
            checking = self.small_font.render("Checking connection...", True, (150, 150, 150))
            screen.blit(checking, (WIDTH // 2 - 85, HEIGHT // 2 + 100))
            return
        
        for i in range(3):
            pygame.draw.line(screen, (60, 60, 80), (LANES[i], 0), (LANES[i], HEIGHT), 2)
        
        for orb in self.orbs:
            if not orb.collected:
                orb.draw(self.player.distance)
        
        for obs in self.obstacles:
            if not obs.hit:
                obs.draw(self.player.distance)
        
        self.player.draw()
        
        progress = min(1.0, self.player.distance / self.finish_line)
        pygame.draw.rect(screen, (50, 50, 50), (10, 10, WIDTH - 20, 20))
        pygame.draw.rect(screen, (100, 255, 100), (10, 10, int((WIDTH - 20) * progress), 20))
        
        # HUD with icons
        tier_text = self.small_font.render(f"Tier: {MAGNET_TIERS[self.player.tier]['name']}", True, (255, 255, 255))
        screen.blit(tier_text, (10, 40))
        
        orb_text = self.small_font.render(f"Orbs: {len(self.player.orbs)}", True, (255, 255, 255))
        screen.blit(orb_text, (10, 65))
        
        level_text = self.small_font.render(f"Level: {self.level}", True, (255, 255, 255))
        screen.blit(level_text, (WIDTH - 100, 40))
        
        # JVW Tokens display
        token_text = self.small_font.render(f"🪙 {self.save.data['tokens']} JVW", True, (255, 215, 0))
        screen.blit(token_text, (WIDTH - 120, 65))
        
        # Buttons (only show if not paused)
        if not self.paused and not self.show_resume_button:
            pygame.draw.rect(screen, (50, 50, 100), (10, 115, 80, 30))
            shop_text = self.small_font.render("Shop", True, (255, 255, 255))
            screen.blit(shop_text, (30, 120))
            
            pygame.draw.rect(screen, (50, 50, 100), (WIDTH - 120, 115, 110, 30))
            lb_text = self.small_font.render("Leaderboard", True, (255, 255, 255))
            screen.blit(lb_text, (WIDTH - 115, 120))
            
            # Pause button
            pygame.draw.rect(screen, (100, 50, 50), (WIDTH // 2 - 40, 115, 80, 30))
            pause_text = self.small_font.render("Pause", True, (255, 255, 255))
            screen.blit(pause_text, (WIDTH // 2 - 22, 120))
        
        if self.show_shop:
            overlay = pygame.Surface((WIDTH, HEIGHT))
            overlay.set_alpha(240)
            overlay.fill((0, 0, 0))
            screen.blit(overlay, (0, 0))
            
            title = self.font.render("🛒 BALL SHOP 🛒", True, (255, 215, 0))
            screen.blit(title, (WIDTH // 2 - 110, 20))
            
            token_display = self.small_font.render(f"💰 {self.save.data['tokens']} JVW Tokens", True, (255, 255, 255))
            screen.blit(token_display, (WIDTH // 2 - 90, 65))
            
            # Check if player can afford any new ball
            can_afford_new = any(
                i not in self.save.data["owned_skins"] and self.save.data["tokens"] >= skin["cost"]
                for i, skin in enumerate(BALL_SKINS)
            )
            if can_afford_new:
                notif = self.small_font.render("✨ New ball available!", True, (100, 255, 100))
                screen.blit(notif, (WIDTH // 2 - 80, 90))
            
            for i, skin in enumerate(BALL_SKINS):
                y_pos = 120 + i * 75
                if y_pos > HEIGHT - 100:
                    break
                    
                owned = i in self.save.data["owned_skins"]
                equipped = i == self.save.data["current_skin"]
                
                # Background box
                box_color = (50, 80, 50) if owned else (40, 40, 60)
                if equipped:
                    box_color = (80, 120, 80)
                pygame.draw.rect(screen, box_color, (20, y_pos, WIDTH - 40, 65), border_radius=8)
                
                # Skin preview with glow if equipped
                if equipped:
                    glow_size = 25 + math.sin(self.anim * 2) * 3
                    pygame.draw.circle(screen, skin["colors"][0], (50, y_pos + 32), int(glow_size))
                
                pygame.draw.circle(screen, skin["colors"][0], (50, y_pos + 32), 18)
                pygame.draw.circle(screen, skin["colors"][1], (50, y_pos + 32), 13)
                
                # Checkmark if owned
                if owned:
                    pygame.draw.circle(screen, (100, 255, 100), (62, y_pos + 20), 8)
                    pygame.draw.line(screen, (255, 255, 255), (59, y_pos + 20), (61, y_pos + 23), 2)
                    pygame.draw.line(screen, (255, 255, 255), (61, y_pos + 23), (65, y_pos + 17), 2)
                
                # Skin info
                name_text = self.small_font.render(skin["name"], True, (255, 255, 255))
                screen.blit(name_text, (85, y_pos + 12))
                
                effect_text = self.small_font.render(f"Effect: {skin['effect'].title()}", True, (180, 180, 180))
                screen.blit(effect_text, (85, y_pos + 35))
                
                if owned:
                    if equipped:
                        status = self.small_font.render("✓ EQUIPPED", True, (100, 255, 100))
                        screen.blit(status, (250, y_pos + 22))
                    else:
                        pygame.draw.rect(screen, (100, 200, 100), (240, y_pos + 15, 110, 35), border_radius=5)
                        equip_text = self.small_font.render("Equip", True, (255, 255, 255))
                        screen.blit(equip_text, (272, y_pos + 22))
                else:
                    cost_text = self.small_font.render(f"{skin['cost']} JVW", True, (255, 215, 0))
                    screen.blit(cost_text, (180, y_pos + 22))
                    
                    can_buy = self.save.data["tokens"] >= skin["cost"]
                    btn_color = (100, 200, 100) if can_buy else (80, 80, 80)
                    pygame.draw.rect(screen, btn_color, (260, y_pos + 15, 90, 35), border_radius=5)
                    buy_text = self.small_font.render("Buy" if can_buy else "Locked", True, (255, 255, 255))
                    screen.blit(buy_text, (278, y_pos + 22))
            
            hint_text = self.small_font.render("Press S to close shop", True, (200, 200, 200))
            screen.blit(hint_text, (WIDTH // 2 - 85, HEIGHT - 40))
        
        if self.show_leaderboard:
            overlay = pygame.Surface((WIDTH, HEIGHT))
            overlay.set_alpha(230)
            overlay.fill((0, 0, 0))
            screen.blit(overlay, (0, 0))
            
            title = self.font.render("🏆 LEADERBOARD 🏆", True, (255, 215, 0))
            screen.blit(title, (WIDTH // 2 - 130, 50))
            
            leaders, player_rank = self.leaderboard.update(self.save.data["name"], self.level)
            for i, entry in enumerate(leaders):
                is_player = entry["name"] == self.save.data["name"] and entry["level"] == self.level
                color = (255, 215, 0) if is_player else ((100, 255, 100) if entry["level"] <= self.level else (255, 255, 255))
                text = self.small_font.render(f"{i+1}. {entry['name']} - Level {entry['level']}", True, color)
                screen.blit(text, (50, 120 + i * 35))
            
            if player_rank:
                rank_text = self.small_font.render(f"Your Rank: #{player_rank}", True, (255, 215, 0))
                screen.blit(rank_text, (WIDTH // 2 - 70, HEIGHT - 100))
            
            close_text = self.small_font.render("Press L to close", True, (200, 200, 200))
            screen.blit(close_text, (WIDTH // 2 - 70, HEIGHT - 50))
        
        # Resume button overlay
        if self.show_resume_button:
            overlay = pygame.Surface((WIDTH, HEIGHT))
            overlay.set_alpha(220)
            overlay.fill((0, 0, 0))
            screen.blit(overlay, (0, 0))
            
            # Pause icon (two bars)
            pygame.draw.rect(screen, (255, 255, 255), (WIDTH // 2 - 30, HEIGHT // 2 - 120, 15, 40))
            pygame.draw.rect(screen, (255, 255, 255), (WIDTH // 2 + 15, HEIGHT // 2 - 120, 15, 40))
            
            pause_text = self.font.render("GAME PAUSED", True, (255, 255, 255))
            screen.blit(pause_text, (WIDTH // 2 - 100, HEIGHT // 2 - 60))
            
            # Resume button with glow
            button_rect = pygame.Rect(WIDTH // 2 - 100, HEIGHT // 2 + 10, 200, 60)
            glow_size = int(5 + math.sin(self.anim * 3) * 2)
            pygame.draw.rect(screen, (80, 180, 80), button_rect.inflate(glow_size, glow_size), border_radius=12)
            pygame.draw.rect(screen, (100, 220, 100), button_rect, border_radius=10)
            pygame.draw.rect(screen, (150, 255, 150), button_rect, 3, border_radius=10)
            
            resume_text = self.font.render("▶ RESUME", True, (255, 255, 255))
            screen.blit(resume_text, (WIDTH // 2 - 70, HEIGHT // 2 + 20))
            
            hint = self.small_font.render("Click to continue playing", True, (200, 200, 200))
            screen.blit(hint, (WIDTH // 2 - 90, HEIGHT // 2 + 90))
            
            # Show current level info
            info = self.small_font.render(f"Level {self.level} - Progress: {int(self.player.distance / self.finish_line * 100)}%", True, (180, 180, 180))
            screen.blit(info, (WIDTH // 2 - 100, HEIGHT // 2 + 120))
        
        if self.game_over:
            overlay = pygame.Surface((WIDTH, HEIGHT))
            overlay.set_alpha(200)
            overlay.fill((0, 0, 0))
            screen.blit(overlay, (0, 0))
            
            if self.won:
                if self.show_ad:
                    # Ad notification screen
                    ad_bg = pygame.Surface((WIDTH - 40, HEIGHT - 200))
                    ad_bg.fill((40, 40, 60))
                    screen.blit(ad_bg, (20, 100))
                    
                    ad_title = self.font.render("📺 ADVERTISEMENT 📺", True, (255, 200, 0))
                    screen.blit(ad_title, (WIDTH // 2 - 140, 130))
                    
                    ad_text = self.small_font.render("Ad opened in browser", True, (255, 255, 255))
                    screen.blit(ad_text, (WIDTH // 2 - 85, HEIGHT // 2 - 40))
                    
                    ad_sub = self.small_font.render("Please check your browser", True, (200, 200, 200))
                    screen.blit(ad_sub, (WIDTH // 2 - 95, HEIGHT // 2 - 10))
                    
                    ad_info = self.small_font.render("Thank you for supporting us!", True, (150, 255, 150))
                    screen.blit(ad_info, (WIDTH // 2 - 100, HEIGHT // 2 + 20))
                    
                    timer_text = self.small_font.render(f"Continuing in {self.ad_timer // 60}s...", True, (150, 150, 150))
                    screen.blit(timer_text, (WIDTH // 2 - 90, HEIGHT - 150))
                    
                    progress = 1 - (self.ad_timer / 180)
                    pygame.draw.rect(screen, (80, 80, 80), (50, HEIGHT - 120, WIDTH - 100, 10))
                    pygame.draw.rect(screen, (100, 255, 100), (50, HEIGHT - 120, int((WIDTH - 100) * progress), 10))
                else:
                    result_text = self.font.render("🏆 LEVEL COMPLETE! 🏆", True, (100, 255, 100))
                    screen.blit(result_text, (WIDTH // 2 - 150, HEIGHT // 2 - 100))
                    
                    token_text = self.small_font.render(f"🪙 +{self.tokens_earned} JVW Tokens", True, (255, 215, 0))
                    screen.blit(token_text, (WIDTH // 2 - 90, HEIGHT // 2 - 40))
                    
                    total_text = self.small_font.render(f"Total: {self.save.data['tokens']} JVW", True, (200, 200, 200))
                    screen.blit(total_text, (WIDTH // 2 - 70, HEIGHT // 2 - 10))
                    
                    next_text = self.small_font.render(f"Next: Level {self.level + 1}", True, (255, 255, 255))
                    screen.blit(next_text, (WIDTH // 2 - 70, HEIGHT // 2 + 40))
                    
                    continue_text = self.small_font.render("Press SPACE to continue", True, (200, 200, 200))
                    screen.blit(continue_text, (WIDTH // 2 - 100, HEIGHT // 2 + 80))
            else:
                if self.show_ad:
                    # Ad notification screen for crash
                    ad_bg = pygame.Surface((WIDTH - 40, HEIGHT - 200))
                    ad_bg.fill((40, 40, 60))
                    screen.blit(ad_bg, (20, 100))
                    
                    ad_title = self.font.render("📺 ADVERTISEMENT 📺", True, (255, 200, 0))
                    screen.blit(ad_title, (WIDTH // 2 - 140, 130))
                    
                    ad_text = self.small_font.render("Ad opened in browser", True, (255, 255, 255))
                    screen.blit(ad_text, (WIDTH // 2 - 85, HEIGHT // 2 - 40))
                    
                    ad_sub = self.small_font.render("Please check your browser", True, (200, 200, 200))
                    screen.blit(ad_sub, (WIDTH // 2 - 95, HEIGHT // 2 - 10))
                    
                    timer_text = self.small_font.render(f"Continuing in {self.ad_timer // 60}s...", True, (150, 150, 150))
                    screen.blit(timer_text, (WIDTH // 2 - 90, HEIGHT - 150))
                    
                    progress = 1 - (self.ad_timer / 180)
                    pygame.draw.rect(screen, (80, 80, 80), (50, HEIGHT - 120, WIDTH - 100, 10))
                    pygame.draw.rect(screen, (100, 255, 100), (50, HEIGHT - 120, int((WIDTH - 100) * progress), 10))
                else:
                    result_text = self.font.render("💥 CRASHED! 💥", True, (255, 100, 100))
                    screen.blit(result_text, (WIDTH // 2 - 100, HEIGHT // 2 - 100))
                    
                    level_text = self.small_font.render(f"Retry Level {self.level}", True, (255, 255, 255))
                    screen.blit(level_text, (WIDTH // 2 - 70, HEIGHT // 2 - 20))
                    
                    restart_text = self.small_font.render("Press SPACE to restart", True, (200, 200, 200))
                    screen.blit(restart_text, (WIDTH // 2 - 110, HEIGHT // 2 + 60))

def name_input_screen():
    input_box = pygame.Rect(WIDTH // 2 - 100, HEIGHT // 2, 200, 40)
    name = ""
    active = True
    anim_time = 0
    
    # Create fewer stars for better performance
    stars = []
    for _ in range(50):
        stars.append({
            "x": random.randint(0, WIDTH),
            "y": random.randint(0, HEIGHT),
            "size": random.randint(1, 2),
            "speed": random.uniform(0.5, 1.5)
        })
    
    title_font = pygame.font.Font(None, 72)
    small_font = pygame.font.Font(None, 28)
    
    while active:
        anim_time += 0.05
        
        # Simple gradient background
        screen.fill((10, 5, 25))
        
        # Draw moving stars (optimized)
        for star in stars:
            star["y"] += star["speed"]
            if star["y"] > HEIGHT:
                star["y"] = 0
                star["x"] = random.randint(0, WIDTH)
            pygame.draw.circle(screen, (200, 200, 200), (star["x"], int(star["y"])), star["size"])
        
        # Animated title
        title_y = HEIGHT // 3 - 50 + math.sin(anim_time) * 5
        title = title_font.render("MAGNO.BP", True, (255, 215, 0))
        screen.blit(title, (WIDTH // 2 - 130, int(title_y)))
        
        subtitle = small_font.render("Merge. Race. Dominate.", True, (150, 150, 255))
        screen.blit(subtitle, (WIDTH // 2 - 110, int(title_y) + 60))
        
        # Input section
        prompt = small_font.render("Enter Your Name:", True, (255, 255, 255))
        screen.blit(prompt, (WIDTH // 2 - 90, HEIGHT // 2 - 50))
        
        # Input box
        glow_color = (100 + int(math.sin(anim_time * 2) * 50), 100, 255)
        pygame.draw.rect(screen, glow_color, input_box, 3)
        pygame.draw.rect(screen, (30, 30, 60), (input_box.x + 3, input_box.y + 3, input_box.width - 6, input_box.height - 6))
        
        name_surface = small_font.render(name + ("_" if int(anim_time * 2) % 2 == 0 else ""), True, (255, 255, 255))
        screen.blit(name_surface, (input_box.x + 10, input_box.y + 8))
        
        # Hint
        hint_alpha = int(200 + math.sin(anim_time * 3) * 55)
        hint = small_font.render("Press ENTER to start", True, (hint_alpha, hint_alpha, hint_alpha))
        screen.blit(hint, (WIDTH // 2 - 100, HEIGHT // 2 + 80))
        
        # Draw floating orbs
        for i in range(3):
            orb_x = WIDTH // 2 + math.cos(anim_time + i * 2) * 150
            orb_y = HEIGHT - 150 + math.sin(anim_time * 1.5 + i * 2) * 30
            colors = [(100, 150, 255), (255, 100, 255), (100, 255, 150)]
            pygame.draw.circle(screen, colors[i], (int(orb_x), int(orb_y)), 15)
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                exit()
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_RETURN and len(name.strip()) > 0:
                    return name.strip()
                elif event.key == pygame.K_BACKSPACE:
                    name = name[:-1]
                elif len(name) < 12 and event.unicode.isprintable():
                    name += event.unicode
        
        pygame.display.flip()
        clock.tick(60)
    
    return None

def main():
    # Check internet connection before starting
    print(f"[INIT] Magno.bp starting...")
    print(f"[INIT] Checking internet connection...")
    
    if not check_internet():
        print(f"[ERROR] No internet connection detected")
        print(f"[ERROR] Game requires Wi-Fi or mobile data to run")
        
        # Show no internet screen
        running = True
        while running:
            screen.fill((20, 20, 40))
            
            font = pygame.font.Font(None, 36)
            small_font = pygame.font.Font(None, 24)
            
            # Warning
            pygame.draw.circle(screen, (255, 200, 0), (WIDTH // 2, HEIGHT // 2 - 80), 40)
            pygame.draw.circle(screen, (0, 0, 0), (WIDTH // 2, HEIGHT // 2 - 80), 35)
            warning = font.render("!", True, (255, 200, 0))
            screen.blit(warning, (WIDTH // 2 - 8, HEIGHT // 2 - 95))
            
            title = font.render("⚠️ NO INTERNET ⚠️", True, (255, 100, 100))
            screen.blit(title, (WIDTH // 2 - 130, HEIGHT // 2 - 20))
            
            msg1 = small_font.render("Internet connection required", True, (255, 255, 255))
            screen.blit(msg1, (WIDTH // 2 - 110, HEIGHT // 2 + 30))
            
            msg2 = small_font.render("Please turn on Wi-Fi to continue", True, (200, 200, 200))
            screen.blit(msg2, (WIDTH // 2 - 120, HEIGHT // 2 + 60))
            
            retry = small_font.render("Press R to retry", True, (150, 150, 150))
            screen.blit(retry, (WIDTH // 2 - 70, HEIGHT // 2 + 100))
            
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    return
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_r:
                        if check_internet():
                            running = False
            
            pygame.display.flip()
            clock.tick(60)
    
    print(f"[INIT] Internet connection confirmed")
    print(f"[INIT] Ad link configured: {AD_LINK}")
    print(f"[INIT] Ads will open in browser after crash and level completion")
    
    save_data = SaveData()
    
    if not save_data.data["name"]:
        player_name = name_input_screen()
        if not player_name:
            return
        save_data.data["name"] = player_name
        save_data.save()
    
    game = Game(save_data)
    running = True
    
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_LEFT and not game.show_leaderboard and not game.show_shop:
                    game.player.move_lane(-1)
                elif event.key == pygame.K_RIGHT and not game.show_leaderboard and not game.show_shop:
                    game.player.move_lane(1)
                elif event.key == pygame.K_l:
                    game.show_leaderboard = not game.show_leaderboard
                    game.show_shop = False
                elif event.key == pygame.K_s:
                    if game.show_shop:
                        # Closing shop - show resume button
                        game.show_shop = False
                        game.show_resume_button = True
                        game.paused = True
                    elif not game.show_leaderboard and not game.show_resume_button and not game.paused:
                        # Opening shop - pause game
                        game.show_shop = True
                        game.paused = True
                        game.show_leaderboard = False
                elif event.key == pygame.K_p and not game.game_over:
                    # Manual pause toggle
                    if game.show_resume_button:
                        game.show_resume_button = False
                        game.paused = False
                    elif not game.show_shop and not game.show_leaderboard:
                        game.show_resume_button = True
                        game.paused = True
                elif event.key == pygame.K_SPACE:
                    if game.show_leaderboard or game.show_shop:
                        pass
                    elif game.game_over:
                        if game.won and not game.show_ad:
                            game = Game(save_data)
                        elif not game.won:
                            game = Game(save_data)
                    else:
                        game.player.holding = not game.player.holding
            elif event.type == pygame.MOUSEBUTTONDOWN:
                mx, my = event.pos
                
                # Resume button click
                if game.show_resume_button:
                    button_rect = pygame.Rect(WIDTH // 2 - 100, HEIGHT // 2 + 10, 200, 60)
                    if button_rect.collidepoint(mx, my):
                        game.show_resume_button = False
                        game.paused = False
                
                # Shop button
                elif 10 <= mx <= 90 and 115 <= my <= 145 and not game.paused and not game.game_over:
                    game.show_shop = True
                    game.paused = True
                    game.show_leaderboard = False
                
                # Leaderboard button
                elif WIDTH - 120 <= mx <= WIDTH - 10 and 115 <= my <= 145 and not game.paused and not game.game_over:
                    game.show_leaderboard = not game.show_leaderboard
                    game.show_shop = False
                
                # Pause button
                elif WIDTH // 2 - 40 <= mx <= WIDTH // 2 + 40 and 115 <= my <= 145 and not game.paused and not game.game_over:
                    game.show_resume_button = True
                    game.paused = True
                elif game.show_shop:
                    for i, skin in enumerate(BALL_SKINS):
                        y_pos = 120 + i * 75
                        if y_pos > HEIGHT - 100:
                            break
                        
                        # Check if clicked on equip button
                        if 240 <= mx <= 350 and y_pos + 15 <= my <= y_pos + 50:
                            if i in save_data.data["owned_skins"]:
                                # Equip the ball
                                save_data.data["current_skin"] = i
                                save_data.save()
                                game.player.skin = BALL_SKINS[i]
                                game.player.trail_particles = []
                            elif save_data.data["tokens"] >= skin["cost"]:
                                # Purchase and equip
                                save_data.data["tokens"] -= skin["cost"]
                                save_data.data["owned_skins"].append(i)
                                save_data.data["current_skin"] = i
                                save_data.save()
                                game.player.skin = BALL_SKINS[i]
                                game.player.trail_particles = []
                                # Visual feedback
                                game.player.squash = 1.5
        
        keys = pygame.key.get_pressed()
        if keys[pygame.K_SPACE] and not game.game_over and not game.show_leaderboard and not game.show_shop and not game.paused and not game.show_resume_button:
            game.player.holding = True
        elif not game.game_over:
            game.player.holding = False
        
        # No need for separate ad timer handling - now in update()
        
        game.update()
        game.draw()
        
        pygame.display.flip()
        clock.tick(60)
    
    pygame.quit()

if __name__ == "__main__":
    main()
