import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { 
  User, Mail, Lock, Shield, Bell, Palette, Database, 
  Building2, Plug, Upload, X, Check, AlertCircle, Eye, EyeOff,
  LogOut, Clock, MapPin, Loader2, Save, RotateCcw
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import PasswordStrengthBar from 'react-password-strength-bar';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({
    full_name: '',
    title: '',
    phone: '',
    timezone: '',
    avatar_url: '',
    company_logo_url: ''
  });

  // Avatar crop state
  const [showAvatarCrop, setShowAvatarCrop] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(null);
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Company logo crop state
  const [showLogoCrop, setShowLogoCrop] = useState(false);
  const [logoSrc, setLogoSrc] = useState(null);
  const [logoCrop, setLogoCrop] = useState({ x: 0, y: 0 });
  const [logoZoom, setLogoZoom] = useState(1);
  const [logoC