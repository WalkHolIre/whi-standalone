// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/lib/utils';
import { useUnsavedChanges } from '@/components/useUnsavedChanges';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, AlertCircle, Languages, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import TourDifficultySummary from '@/components/TourDifficultySummary';
import { toast } from 'sonner';
import { LoadingState } from '@/components/LoadingState';
import { getFieldKey, getParsedArrayField, getRichTextField } from '../components/LanguageAwareInput';
import { generateTourCode } from '../components/TourCodeGenerator';
import TourBasicInfo from '@/components/AdminTourEditor/TourBasicInfo';
import TourContent from '@/components/AdminTourEditor/TourContent';
import TourAccommodation from '@/components/AdminTourEditor/TourAccommodation';
import TourMedia from '@/components/AdminTourEditor/TourMedia';
import TourSEO from '@/components/AdminTourEditor/TourSEO';
import TourItinerary from '@/components/AdminTourEditor/TourItinerary';

const ItineraryMapPanel = dynamic(() => import('@/components/ItineraryMapPanel'), { ssr: false });

export default function AdminTourEditor() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [paramsId, setParamsId] = useState('');
  useEffect(() => {
    setParamsId(new URLSearchParams(window.location.search).get('id'));
  }, []);
  const tourId = paramsId;
  
  
  const isEditMode = !!tourId;
  const { hasChanges, markChanged, markSaved } = useUnsavedChanges();

  const languages = ['en', 'de', 'nl', 'es', 'fr'];

  const [formData, setFormData] = useState({
    name: '', subtitle: '', slug: '', code: '',
    tour_type: 'self_guided', status: 'draft', destination_id: '',
    difficulty_level: 'moderate', duration_days: 7, walking_days: 5,
    price_per_person_eur: 0, hero_image: '', accommodation_image: '',
    gallery: [], best_months: [],
    // English
    description_en: '', highlights_en: '[]', who_is_it_for_en: '',
    additional_inclusions_en: '[]', accommodation_type_en: '', accommodation_description_en: '',
    meta_title_en: '', meta_description_en: '', itinerary_en: [],
    // German
    name_de: '', subtitle_de: '', description_de: '', highlights_de: '[]',
    who_is_it_for_de: '', additional_inclusions_de: '[]', accommodation_type_de: '',
    accommodation_description_de: '', meta_title_de: '', meta_description_de: '',
    itinerary_de: [], translation_status_de: 'not_started',
    // Dutch
    name_nl: '', subtitle_nl: '', description_nl: '', highlights_nl: '[]',
    who_is_it_for_nl: '', additional_inclusions_nl: '[]', accommodation_type_nl: '',
    accommodation_description_nl: '', meta_title_nl: '', meta_description_nl: '',
    itinerary_nl: [], translation_status_nl: 'not_started',
    // Spanish
    name_es: '', subtitle_es: '', description_es: '', highlights_es: '[]',
    who_is_it_for_es: '', additional_inclusions_es: '[]', accommodation_type_es: '',
    accommodation_description_es: '', meta_title_es: '', meta_description_es: '',
    itinerary_es: [], translation_status_es: 'not_started',
    // French
    name_fr: '', subtitle_fr: '', description_fr: '', highlights_fr: '[]',
    who_is_it_for_fr: '', additional_inclusions_fr: '[]', accommodation_type_fr: '',
    accommodation_description_fr: '', meta_title_fr: '', meta_description_fr: '',
    itinerary_fr: [], translation_status_fr: 'not_started'
  });

  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [languageChangesMap, setLanguageChangesMap] = useState({ en: false, de: false, nl: false, es: false, fr: false });
  const [itinerary, setItinerary] = useState([]);
  const [expandedDay, setExpandedDay] = useState(null);
  const [selectedDayOnMap, setSelectedDayOnMap] = useState(null);
  const [dirtyFields, setDirtyFields] = useState(new Set());
  const [showNavConfirm, setShowNavConfirm] = useState(false);
  const [showLanguageSwitchConfirm, setShowLanguageSwitchConfirm] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [pendingLanguage, setPendingLanguage] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslateConfirm, setShowTranslateConfirm] = useState(false);
  const [pendingTranslateLang, setPendingTranslateLang] = useState(null);

  // Fetch tour data if editing
  const { data: tour, isLoading } = useQuery({
    queryKey: ['tour', tourId],
    queryFn: async () => {
      if (!tourId) return null;
      const { data } = await supabase.from('tours').select('*').match({ id: tourId });
      const tours = data || [];
      return tours[0] || null;
    },
    enabled: isEditMode
  });

  // Fetch destinations and regions for dropdown
  const { data: destinations = [] } = useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const { data } = await supabase.from('destinations').select('*').match({ status: 'published' });
      return data || [];
    },
    staleTime: 30 * 60 * 1000
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await supabase.from('regions').select('*').match({ status: 'active' });
      return data || [];
    },
    staleTime: 30 * 60 * 1000
  });

  // Fetch routes for itinerary
  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data } = await supabase.from('routes').select('*');
      return data || [];
    },
    staleTime: 30 * 60 * 1000
  });

  // Load tour data into form
  useEffect(() => {
    if (tour) {
      let destination_id = tour.destination_id;

      if (destination_id && !destination_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const foundDest = destinations.find((d) => d.slug === destination_id);
        if (foundDest) {
          destination_id = foundDest.id;
        }
      }

      const newFormData = { ...tour, destination_id };

      // Process language-specific array fields (highlights, additional_inclusions)
      languages.forEach((lang) => {
        ['highlights', 'additional_inclusions'].forEach((baseName) => {
          const key = getFieldKey(baseName, lang);
          const value = tour[key];
          if (value && typeof value === 'string') {
            try {
              newFormData[key] = JSON.parse(value);
            } catch (e) {
              newFormData[key] = [];
            }
          } else {
            newFormData[key] = Array.isArray(value) ? value : [];
          }
        });

        // Itinerary fields are already arrays, no stringification needed
        const itineraryKey = getFieldKey('itinerary', lang);
        newFormData[itineraryKey] = Array.isArray(tour[itineraryKey]) ? tour[itineraryKey] : [];
      });

      // Ensure non-language fields
      newFormData.gallery = tour.gallery || [];
      newFormData.best_months = tour.best_months || [];

      setFormData(newFormData);
      // Set the itinerary state based on the selected language's itinerary
      setItinerary(getParsedArrayField(newFormData, 'itinerary', selectedLanguage));
    }
  }, [tour, destinations, regions, selectedLanguage]); // Added selectedLanguage to dependency array for initial load update

  // Update itinerary state when selectedLanguage changes (after initial load)
  useEffect(() => {
    // Only update if formData is already populated and not during initial tour load to avoid double setting
    if (tour && !isLoading) {
      setItinerary(getParsedArrayField(formData, 'itinerary', selectedLanguage));
    }
  }, [selectedLanguage, formData, isLoading, tour, languageChangesMap]);


  // Auto-generate slug from title
  useEffect(() => {
    if (formData.name && !isEditMode) {
      const slug = formData.name.
        toLowerCase().
        replace(/[^a-z0-9]+/g, '-').
        replace(/^-|-$/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.name, isEditMode]);

  // Normalize data before saving
  // Valid columns in the tours table
  const TOURS_COLUMNS = [
    'destination_id', 'name', 'code', 'slug', 'subtitle', 'overview', 'description',
    'short_description', 'highlights', 'whats_included', 'whats_not_included',
    'difficulty_level', 'tour_difficulty_grade', 'duration_days', 'price_per_person_eur',
    'status', 'itinerary', 'hero_image', 'gallery', 'best_months', 'tour_type',
    'region_name', 'meta_title', 'seo_description', 'seo_keywords', 'sort_order',
    'featured', 'min_walkers', 'max_walkers', 'min_extra_days', 'max_extra_days',
    'extra_day_price_eur', 'single_supplement_eur', 'total_distance_km',
    'elevation_gain_m', 'daily_distance_min_km', 'daily_distance_max_km',
  ];

  const normalizeData = (data) => {
    const dbData = {};

    // Only include fields that exist in the tours table
    TOURS_COLUMNS.forEach((col) => {
      if (col in data) {
        dbData[col] = data[col];
      }
    });

    // Map English-suffixed fields to plain column names
    if (data.name_en && !dbData.name) dbData.name = data.name_en;
    if (data.subtitle_en && !dbData.subtitle) dbData.subtitle = data.subtitle_en;
    if (data.description_en && !dbData.description) dbData.description = data.description_en;
    if (data.meta_title_en && !dbData.meta_title) dbData.meta_title = data.meta_title_en;
    if (data.meta_description_en) dbData.seo_description = data.meta_description_en;
    if (data.who_is_it_for_en) dbData.who_is_it_for = data.who_is_it_for_en;
    if (data.accommodation_description_en) dbData.accommodation_description = data.accommodation_description_en;

    // Handle English itinerary
    if (Array.isArray(data.itinerary_en) && data.itinerary_en.length > 0) {
      dbData.itinerary = data.itinerary_en;
    }

    // Handle highlights — stored as text in DB
    const hl = data.highlights_en || data.highlights;
    if (Array.isArray(hl)) {
      dbData.highlights = JSON.stringify(hl);
    } else if (typeof hl === 'string') {
      dbData.highlights = hl;
    }

    // Ensure array fields are arrays
    if (!Array.isArray(dbData.gallery)) dbData.gallery = [];
    if (!Array.isArray(dbData.best_months)) dbData.best_months = [];

    return dbData;
  };

  // Quick field save mutation (no refetch)
  const fieldSaveMutation = useMutation({
    mutationFn: async (saveData) => {
      const normalized = normalizeData(saveData);
      if (isEditMode) {
        const response = await supabase.from('tours').update(normalized).eq('id', tourId).select().single();
        return response.data;
      } else {
        const response = await supabase.from('tours').insert(normalized).select().single();
        return response.data;
      }
    },
    onSuccess: () => {








      // Don't refetch - just keep local state
    }, onError: (error) => { toast.error('Failed to save: ' + error.message); }
  }); const saveMutation = useMutation({
    mutationFn: async (saveData) => {// Calculate totals based on the English itinerary only
      const englishItinerary = getParsedArrayField(saveData, 'itinerary', 'en'); const daysWithRoutes = englishItinerary.filter((day) => day.route_ids && day.route_ids.length > 0); const distances = [];
      let totalDistance = 0;
      let totalElevation = 0;

      daysWithRoutes.forEach((day) => {
        const primaryRouteId = day.route_ids[0];
        const route = routes.find((r) => r.id === primaryRouteId);
        if (route) {
          totalDistance += route.distance_km || 0;
          totalElevation += route.elevation_gain_m || 0;
          if (route.distance_km > 0) distances.push(route.distance_km);
        }
      });

      // Calculate difficulty grade from routes
      const effortKms = daysWithRoutes
        .map(day => routes.find(r => r.id === day.route_ids[0]))
        .filter(Boolean)
        .map(r => r.difficulty_score || r.effort_km || 0);

      let tour_difficulty_grade = saveData.tour_difficulty_grade;
      if (effortKms.length > 0) {
        const avgDifficultyScore = effortKms.reduce((sum, v) => sum + v, 0) / effortKms.length;
        if (avgDifficultyScore < 18) tour_difficulty_grade = 'Easy';
        else if (avgDifficultyScore < 25) tour_difficulty_grade = 'Moderate';
        else if (avgDifficultyScore < 30) tour_difficulty_grade = 'Challenging';
        else tour_difficulty_grade = 'Challenging+';
      }

      // Generate and update tour code
      const destination = destinations.find((d) => d.id === saveData.destination_id);
      const region = destination ? regions.find((r) => r.id === destination.region_id) : null;
      const generatedCode = generateTourCode({ ...saveData, tour_difficulty_grade }, destination, region);

      const dataToSave = {
        ...saveData,
        code: generatedCode,
        tour_difficulty_grade,
        total_distance_km: Math.round(totalDistance * 10) / 10,
        elevation_gain_m: Math.round(totalElevation),
        daily_distance_min_km: distances.length > 0 ? Math.min(...distances) : 0,
        daily_distance_max_km: distances.length > 0 ? Math.max(...distances) : 0
      };

      const normalized = normalizeData(dataToSave);

      if (isEditMode) {
        const response = await supabase.from('tours').update(normalized).eq('id', tourId).select().single();
        return response.data;
      } else {
        const response = await supabase.from('tours').insert(normalized).select().single();
        return response.data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      queryClient.invalidateQueries({ queryKey: ['tour', tourId] });
      markSaved();
      setDirtyFields(new Set());
      setLanguageChangesMap(Object.fromEntries(languages.map((lang) => [lang, false])));
      toast.success('Tour saved successfully');

      if (!isEditMode) {
        router.push(createPageUrl('AdminTourEditor') + '?id=' + data.id);
      }
    },
    onError: (error) => {
      toast.error('Failed to save tour: ' + error.message);
    }
  });

  const handleSaveAll = () => {
    saveMutation.mutate(formData);
  };

  const handleTabSave = async () => {
    return new Promise((resolve) => {
      saveMutation.mutate(formData, {
        onSuccess: () => {
          const langName = { en: 'English', de: 'German', nl: 'Dutch', es: 'Spanish', fr: 'French' }[selectedLanguage];
          toast.success(`${langName} ${selectedLanguage !== 'en' ? 'translation ' : ''}saved ✓`);
          setLanguageChangesMap((prev) => ({ ...prev, [selectedLanguage]: false }));
          resolve();
        }
      });
    });
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    markChanged();
    setDirtyFields((prev) => new Set(prev).add(field));
    setLanguageChangesMap((prev) => ({ ...prev, [selectedLanguage]: true }));
  };

  const handleLanguageSwitch = (newLang) => {
    if (languageChangesMap[selectedLanguage] || hasChanges) {
      setPendingLanguage(newLang);
      setShowLanguageSwitchConfirm(true);
    } else {
      setSelectedLanguage(newLang);
    }
  };

  const handleAutoTranslate = async () => {
    const langMap = { de: 'German', nl: 'Dutch', es: 'Spanish', fr: 'French' };
    const targetLangName = langMap[selectedLanguage] || selectedLanguage.toUpperCase();

    setPendingTranslateLang({ code: selectedLanguage, name: targetLangName });
    setShowTranslateConfirm(true);
  };

  const performTranslation = async (targetLangCode) => {
    const langMap = { de: 'German', nl: 'Dutch', es: 'Spanish', fr: 'French' };
    const targetLangName = langMap[targetLangCode] || targetLangCode.toUpperCase();

    setIsTranslating(true);
    toast.info(`Translating to ${targetLangName}...`);

    try {
      const langSuffix = targetLangCode;
      const targetLanguageFull = langMap[targetLangCode];

      // Gather English source fields
      const englishContent = {
        title: getRichTextField(formData, 'name', 'en') || '',
        subtitle: getRichTextField(formData, 'subtitle', 'en') || '',
        overview: getRichTextField(formData, 'description', 'en') || '',
        highlights: getParsedArrayField(formData, 'highlights', 'en') || [],
        who_is_it_for: getRichTextField(formData, 'who_is_it_for', 'en') || '',
        accommodation_description: getRichTextField(formData, 'accommodation_description', 'en') || '',
        meta_title: getRichTextField(formData, 'meta_title', 'en') || '',
        meta_description: getRichTextField(formData, 'meta_description', 'en') || '',
        itinerary: getParsedArrayField(formData, 'itinerary', 'en').map((day) => ({
          day: day.day,
          title: day.title || '',
          description: day.description || ''
        })),
        additional_inclusions: getParsedArrayField(formData, 'additional_inclusions', 'en') || []
      };

      // Call translation API
      // TODO: Migrate to Supabase Edge Function
      console.warn('TODO: Migrate base44.functions.invoke(whiCopywriter) to Supabase Edge Function');
      // const response = await supabase.functions.invoke('whiCopywriter', {
      //   body: {
      //     action: 'translate',
      //     target_language: targetLanguageFull,
      //     content: englishContent
      //   }
      // });
      const response = { data: { success: false, error: 'Migration pending' } };

      // Parse response
      let translatedData;
      try {
        if (response.data?.success === false) {
          console.error("Translation API error:", response.data.error);
          toast.error(`Translation failed: ${response.data.error}`);
          setIsTranslating(false);
          return;
        }

        translatedData = response.data?.data || response.data;

        if (!translatedData || typeof translatedData !== 'object') {
          throw new Error('Invalid translation response structure');
        }
      } catch (parseError) {
        console.error("Failed to parse translation API response:", response.data, parseError);
        toast.error("Translation returned invalid data. Please try again or translate manually.");
        setIsTranslating(false);
        return;
      }

      // Populate translation fields
      // Use setFormData directly once to avoid multiple re-renders and re-triggering handleInputChange side effects
      const updatedFormData = { ...formData };

      updatedFormData[getFieldKey('name', langSuffix)] = translatedData.title || '';
      updatedFormData[getFieldKey('subtitle', langSuffix)] = translatedData.subtitle || '';
      updatedFormData[getFieldKey('description', langSuffix)] = translatedData.overview || '';
      updatedFormData[getFieldKey('highlights', langSuffix)] = translatedData.highlights || [];
      updatedFormData[getFieldKey('who_is_it_for', langSuffix)] = translatedData.who_is_it_for || '';
      updatedFormData[getFieldKey('accommodation_description', langSuffix)] = translatedData.accommodation_description || '';
      updatedFormData[getFieldKey('meta_title', langSuffix)] = translatedData.meta_title || '';
      updatedFormData[getFieldKey('meta_description', langSuffix)] = translatedData.meta_description || '';

      // Translate itinerary (copy English structure, then apply translated titles/descriptions)
      if (translatedData.itinerary && Array.isArray(translatedData.itinerary)) {
        const englishItinerary = getParsedArrayField(updatedFormData, 'itinerary', 'en');
        const newItineraryLang = englishItinerary.map((originalDay, index) => {
          const translatedDay = translatedData.itinerary[index];
          if (translatedDay) {
            return {
              ...originalDay,
              title: translatedDay.title || originalDay.title,
              description: translatedDay.description || originalDay.description
            };
          }
          return originalDay;
        });
        updatedFormData[getFieldKey('itinerary', langSuffix)] = newItineraryLang;
      }

      // Set additional_inclusions for the specific language
      if (translatedData.additional_inclusions && Array.isArray(translatedData.additional_inclusions)) {
        updatedFormData[getFieldKey('additional_inclusions', langSuffix)] = translatedData.additional_inclusions;
      }

      // Set translation status to "draft"
      updatedFormData[getFieldKey('translation_status', langSuffix)] = 'draft';

      setFormData(updatedFormData);
      setItinerary(getParsedArrayField(updatedFormData, 'itinerary', selectedLanguage));

      // Auto-save the translation
      toast.info('Saving translation...');
      saveMutation.mutate(updatedFormData, {
        onSuccess: () => {
          toast.success(`${targetLangName} translation saved successfully!`);
        }
      });

    } catch (error) {
      console.error("Auto-translation failed:", error);
      toast.error("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleImageUpload = async (field, file) => {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error: uploadError } = await supabase.storage.from('tour-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(fileName);

      // TODO: Create image record in database
      // await supabase.from('images').insert({
      //   url: publicUrl,
      //   original_url: publicUrl,
      //   title: file.name.replace(/\.[^/.]+$/, ''),
      //   file_size: file.size,
      //   format: file.type.split('/')[1]
      // });

      handleInputChange(field, publicUrl);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  const handleGalleryUpload = async (files) => {
    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          const fileName = `${Date.now()}-${Math.random()}-${file.name}`;
          const { data, error: uploadError } = await supabase.storage.from('tour-images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(fileName);

          // TODO: Create image record in database
          // await supabase.from('images').insert({
          //   url: publicUrl,
          //   original_url: publicUrl,
          //   title: file.name.replace(/\.[^/.]+$/, ''),
          //   file_size: file.size,
          //   format: file.type.split('/')[1]
          // });

          return publicUrl;
        })
      );
      handleInputChange('gallery', [...(formData.gallery || []), ...uploads]);
      toast.success(`${files.length} image(s) added to gallery`);
    } catch (error) {
      toast.error('Failed to upload images');
    }
  };

  const removeGalleryImage = (index) => {
    const newGallery = [...(formData.gallery || [])];
    newGallery.splice(index, 1);
    handleInputChange('gallery', newGallery);
  };

  const toggleMonth = (month) => {
    const currentMonths = formData.best_months || [];
    const newMonths = currentMonths.includes(month) ?
      currentMonths.filter((m) => m !== month) :
      [...currentMonths, month];
    handleInputChange('best_months', newMonths);
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Itinerary functions - update both local state and formData
  const updateItineraryAndFormData = (newItinerary) => {
    setItinerary(newItinerary); // Update local itinerary state for current language
    handleInputChange(getFieldKey('itinerary', selectedLanguage), newItinerary); // Update formData with current language itinerary
  };

  const addDay = () => {
    const newDay = {
      day: itinerary.length + 1,
      title: '',
      description: '',
      route_ids: [],
      overnight_location: null,
      daily_locations: []
    };
    updateItineraryAndFormData([...itinerary, newDay]);
    setExpandedDay(itinerary.length);
  };

  const updateDay = (index, field, value) => {
    const newItinerary = [...itinerary];
    newItinerary[index] = { ...newItinerary[index], [field]: value };
    updateItineraryAndFormData(newItinerary);
  };

  const deleteDay = (index) => {
    if (confirm('Are you sure you want to delete this day?')) {
      const newItinerary = itinerary.filter((_, i) => i !== index);
      const renumbered = newItinerary.map((day, i) => ({ ...day, day: i + 1 }));
      updateItineraryAndFormData(renumbered);
    }
  };

  const moveDayUp = (index) => {
    if (index === 0) return;
    const newItinerary = [...itinerary];
    [newItinerary[index - 1], newItinerary[index]] = [newItinerary[index], newItinerary[index - 1]];
    const renumbered = newItinerary.map((day, i) => ({ ...day, day: i + 1 }));
    updateItineraryAndFormData(renumbered);
  };

  const moveDayDown = (index) => {
    if (index === itinerary.length - 1) return;
    const newItinerary = [...itinerary];
    [newItinerary[index], newItinerary[index + 1]] = [newItinerary[index + 1], newItinerary[index]];
    const renumbered = newItinerary.map((day, i) => ({ ...day, day: i + 1 }));
    updateItineraryAndFormData(renumbered);
  };

  const handleAssignRoute = (dayIndex, routeId) => {
    const newItinerary = [...itinerary];
    if (!newItinerary[dayIndex].route_ids) {
      newItinerary[dayIndex].route_ids = [];
    }
    if (!newItinerary[dayIndex].route_ids.includes(routeId)) {
      newItinerary[dayIndex].route_ids.push(routeId);
    }
    updateItineraryAndFormData(newItinerary);
  };

  const handleRemoveRoute = (dayIndex, routeId) => {
    const newItinerary = [...itinerary];
    newItinerary[dayIndex].route_ids = (newItinerary[dayIndex].route_ids || []).filter((id) => id !== routeId);
    updateItineraryAndFormData(newItinerary);
  };

  const handleReorderRoutes = (dayIndex, routeIndex, direction) => {
    const newItinerary = [...itinerary];
    const routeIds = [...(newItinerary[dayIndex].route_ids || [])];

    if (direction === 'up' && routeIndex > 0) {
      [routeIds[routeIndex - 1], routeIds[routeIndex]] = [routeIds[routeIndex], routeIds[routeIndex - 1]];
    } else if (direction === 'down' && routeIndex < routeIds.length - 1) {
      [routeIds[routeIndex], routeIds[routeIndex + 1]] = [routeIds[routeIndex + 1], routeIds[routeIndex]];
    }

    newItinerary[dayIndex].route_ids = routeIds;
    updateItineraryAndFormData(newItinerary);
  };

  const addLocation = (dayIndex) => {
    const newItinerary = [...itinerary];
    if (!newItinerary[dayIndex].daily_locations) {
      newItinerary[dayIndex].daily_locations = [];
    }
    newItinerary[dayIndex].daily_locations.push({
      name: '',
      type: 'point_of_interest',
      description: '',
      lat: 0,
      lng: 0
    });
    updateItineraryAndFormData(newItinerary);
  };

  const updateLocation = (dayIndex, locIndex, field, value) => {
    const newItinerary = [...itinerary];
    newItinerary[dayIndex].daily_locations[locIndex][field] = value;
    updateItineraryAndFormData(newItinerary);
  };

  const removeLocation = (dayIndex, locIndex) => {
    const newItinerary = [...itinerary];
    newItinerary[dayIndex].daily_locations.splice(locIndex, 1);
    updateItineraryAndFormData(newItinerary);
  };

  // Calculate totals from route library
  const calculateTotals = () => {
    // Always use the English itinerary for physical properties
    const englishItinerary = getParsedArrayField(formData, 'itinerary', 'en');
    const daysWithRoutes = englishItinerary.filter((day) => day.route_ids && day.route_ids.length > 0);
    const distances = [];
    let totalDistance = 0;
    let totalElevation = 0;
    let walkingDays = 0;

    daysWithRoutes.forEach((day) => {
      const primaryRouteId = day.route_ids[0];
      const route = routes.find((r) => r.id === primaryRouteId);
      if (route) {
        totalDistance += route.distance_km || 0;
        totalElevation += route.elevation_gain_m || 0;
        if (route.distance_km > 0) distances.push(route.distance_km);
        walkingDays++;
      }
    });

    return {
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalElevation: Math.round(totalElevation),
      walkingDays,
      minDistance: distances.length > 0 ? Math.min(...distances) : 0,
      maxDistance: distances.length > 0 ? Math.max(...distances) : 0,
      avgDistance: distances.length > 0 ? Math.round(totalDistance / distances.length * 10) / 10 : 0
    };
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <LoadingState message="Loading tour..." />
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Navigation Confirmation Dialog */}
        {showNavConfirm &&
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 p-6 max-w-sm">
              <h3 className="text-lg font-semibold mb-2">Unsaved Changes</h3>
              <p className="text-slate-600 mb-6">You have unsaved changes. Save before leaving?</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowNavConfirm(false)} className="bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-300">Cancel</Button>
                <Button variant="outline" onClick={() => {
                  setShowNavConfirm(false);
                  if (pendingNavigation) pendingNavigation();
                }} className="bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-300">Leave Without Saving</Button>
                <Button onClick={() => {
                  saveMutation.mutate(formData, {
                    onSuccess: () => {
                      setShowNavConfirm(false);
                      if (pendingNavigation) pendingNavigation();
                    }
                  });
                }} className="text-white bg-whi hover:bg-whi-hover">Save & Leave</Button>
              </div>
            </div>
          </div>
        }

        {/* Language Switch Confirmation Dialog */}
        {showLanguageSwitchConfirm &&
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 p-6 max-w-sm">
              <h3 className="text-lg font-semibold mb-2">Unsaved Changes</h3>
              <p className="text-slate-600 mb-6">
                You have unsaved changes to the {
                  selectedLanguage === 'en' ? 'English' :
                    selectedLanguage === 'de' ? 'German' :
                      selectedLanguage === 'nl' ? 'Dutch' :
                        selectedLanguage === 'es' ? 'Spanish' : 'French'
                } translation. Save before switching?
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowLanguageSwitchConfirm(false)} className="bg-slate-100 text-slate-900 hover:bg-slate-200">Cancel</Button>
                <Button variant="outline" onClick={() => {
                  setShowLanguageSwitchConfirm(false);
                  // Discard changes for the current language
                  setLanguageChangesMap((prev) => ({ ...prev, [selectedLanguage]: false }));
                  setSelectedLanguage(pendingLanguage);
                }} className="bg-slate-100 text-slate-900 hover:bg-slate-200">Discard</Button>
                <Button onClick={() => {
                  saveMutation.mutate(formData, {
                    onSuccess: () => {
                      setShowLanguageSwitchConfirm(false);
                      // Mark current language as saved
                      setLanguageChangesMap((prev) => ({ ...prev, [selectedLanguage]: false }));
                      setSelectedLanguage(pendingLanguage);
                    }
                  });
                }} className="bg-whi hover:bg-whi-hover text-white">Save</Button>
              </div>
            </div>
          </div>
        }

        {/* Auto-Translate Confirmation Dialog */}
        <AlertDialog open={showTranslateConfirm} onOpenChange={setShowTranslateConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Auto-Translate Content</AlertDialogTitle>
              <AlertDialogDescription>
                This will auto-translate all English content to {pendingTranslateLang?.name} across all tabs. Existing translations will be overwritten.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowTranslateConfirm(false);
                if (pendingTranslateLang) {
                  performTranslation(pendingTranslateLang.code);
                }
              }} className="bg-whi hover:bg-whi-hover text-white">
                Translate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Header */}
        <div className="text-slate-500 mt-1 mb-6 px-2 py-1 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                if (hasChanges) {
                  setShowNavConfirm(true);
                  setPendingNavigation(() => () => router.push(createPageUrl('AdminTourManagement')));
                } else {
                  router.push(createPageUrl('AdminTourManagement'));
                }
              }}
              className="bg-slate-300 text-slate-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-9 gap-2 hover:bg-slate-200 border-slate-300">
              <ArrowLeft className="w-4 h-4" />
              Back to Tours
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {isEditMode ? `Edit: ${formData.name || 'Tour'}` : 'New Tour'}
              </h1>
              {hasChanges &&
                <div className="flex items-center gap-2 text-sm text-amber-600 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  Unsaved changes
                </div>
              }
            </div>
          </div>
          <Button
            onClick={handleSaveAll}
            disabled={saveMutation.isPending || !hasChanges}
            className="gap-2 bg-slate-300 text-slate-700 hover:bg-slate-200 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save All'}
          </Button>
        </div>

        {/* Language Switcher Bar */}
        <div className="bg-slate-100 border-b border-slate-300 py-3 px-4 rounded-t-lg mt-6 flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {[
              { code: 'en', flag: '🇬🇧', label: 'English' },
              { code: 'de', flag: '🇩🇪', label: 'German' },
              { code: 'nl', flag: '🇳🇱', label: 'Dutch' },
            ].map(({ code, flag, label }) => {
              const isActive = selectedLanguage === code;
              const hasChanges = languageChangesMap[code];
              return (
                <Button
                  key={code}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageSwitch(code)}
                  disabled={isTranslating}
                  className={isActive ? 'bg-slate-800 text-white border-slate-800' : ''}
                >
                  <span className="mr-1">{flag}</span>
                  {label}{hasChanges ? ' *' : ''}
                </Button>
              );
            })}
          </div>

          {selectedLanguage !== 'en' &&
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      formData[`translation_status_${selectedLanguage}`] === 'published' ? '#16A34A' :
                        formData[`translation_status_${selectedLanguage}`] === 'draft' ? '#F17E00' :
                          '#DC2626'
                  }} />
                <span className="text-sm text-slate-700">
                  {formData[`translation_status_${selectedLanguage}`] === 'published' ? 'Published' :
                    formData[`translation_status_${selectedLanguage}`] === 'draft' ? 'Draft' :
                      'Not Started'}
                </span>
                <Select
                  value={formData[`translation_status_${selectedLanguage}`] || 'not_started'}
                  onValueChange={(value) => handleInputChange(`translation_status_${selectedLanguage}`, value)}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleAutoTranslate}
                disabled={isTranslating || saveMutation.isPending}
                className="bg-slate-300 text-slate-600 px-3 text-xs font-medium rounded-[10px] inline-flex items-center justify-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 gap-2 hover:bg-whi-hover disabled:opacity-50">
                {isTranslating ?
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Translating...
                  </> :

                  <>
                    <Languages className="w-4 h-4" />
                    Auto-Translate All
                  </>
                }
              </Button>
            </div>
          }
        </div>

        {/* Loading Overlay */}
        {isTranslating &&
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 p-8 max-w-md text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-whi" />
              <h3 className="text-lg font-semibold mb-2">
                Translating all fields to {
                  selectedLanguage === 'de' ? 'German' :
                    selectedLanguage === 'nl' ? 'Dutch' :
                      selectedLanguage === 'es' ? 'Spanish' : 'French'
                }...
              </h3>
              <p className="text-sm text-slate-600">This may take 30-60 seconds.</p>
            </div>
          </div>
        }

        {/* Tabs */}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="bg-slate-200 text-slate-900 pt-3 pb-3 rounded-b-lg rounded-t-none h-12 items-center justify-center grid grid-cols-6 w-full">
            <TabsTrigger value="basic" className="data-[state=inactive]:text-slate-900 relative" disabled={isTranslating}>Basic Info</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=inactive]:text-slate-900 relative" disabled={isTranslating}>Content</TabsTrigger>
            <TabsTrigger value="itinerary" className="data-[state=inactive]:text-slate-900 relative" disabled={isTranslating}>Itinerary</TabsTrigger>
            <TabsTrigger value="accommodation" className="data-[state=inactive]:text-slate-900 relative" disabled={isTranslating}>Accommodation</TabsTrigger>
            <TabsTrigger value="media" className="data-[state=inactive]:text-slate-900 relative" disabled={isTranslating}>Media</TabsTrigger>
            <TabsTrigger value="seo" className="data-[state=inactive]:text-slate-900 relative" disabled={isTranslating}>SEO</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic">
            <TourBasicInfo
              formData={formData}
              selectedLanguage={selectedLanguage}
              destinations={destinations}
              regions={regions}
              routes={routes}
              saveMutation={saveMutation}
              handleInputChange={handleInputChange}
              fieldSaveMutation={fieldSaveMutation}
              isTranslating={isTranslating}
              onSave={handleTabSave}
            />

            {isEditMode && itinerary.length > 0 && (
              <TourDifficultySummary itinerary={itinerary} routes={routes} />
            )}
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <TourContent
              formData={formData}
              selectedLanguage={selectedLanguage}
              saveMutation={saveMutation}
              handleInputChange={handleInputChange}
              isTranslating={isTranslating}
              onSave={handleTabSave}
            />
          </TabsContent>

          {/* Itinerary Tab */}
          <TabsContent value="itinerary">
            <TourItinerary
              itinerary={itinerary}
              selectedLanguage={selectedLanguage}
              formData={formData}
              routes={routes}
              saveMutation={saveMutation}
              selectedDayOnMap={selectedDayOnMap}
              expandedDay={expandedDay}
              totals={totals}
              handleInputChange={handleInputChange}
              addDay={addDay}
              updateDay={updateDay}
              deleteDay={deleteDay}
              moveDayUp={moveDayUp}
              moveDayDown={moveDayDown}
              handleAssignRoute={handleAssignRoute}
              handleRemoveRoute={handleRemoveRoute}
              handleReorderRoutes={handleReorderRoutes}
              addLocation={addLocation}
              updateLocation={updateLocation}
              removeLocation={removeLocation}
              setExpandedDay={setExpandedDay}
              setSelectedDayOnMap={setSelectedDayOnMap}
              isTranslating={isTranslating}
              onSave={handleTabSave}
            />

            {itinerary.length > 0 && (
              <div className="w-full mt-6">
                <Card className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border-slate-200/60">
                  <CardHeader><CardTitle>Route Map</CardTitle></CardHeader>
                  <CardContent>
                    <div style={{ height: '450px', width: '100%' }}>
                      <ItineraryMapPanel itinerary={itinerary} selectedDayIndex={selectedDayOnMap} routes={routes} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Accommodation Tab */}
          <TabsContent value="accommodation">
            <TourAccommodation
              formData={formData}
              selectedLanguage={selectedLanguage}
              saveMutation={saveMutation}
              handleInputChange={handleInputChange}
              handleImageUpload={handleImageUpload}
              isTranslating={isTranslating}
              onSave={handleTabSave}
            />
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media">
            <TourMedia
              formData={formData}
              saveMutation={saveMutation}
              handleInputChange={handleInputChange}
              handleImageUpload={handleImageUpload}
              handleGalleryUpload={handleGalleryUpload}
              removeGalleryImage={removeGalleryImage}
              isTranslating={isTranslating}
              onSave={handleTabSave}
            />
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo">
            <TourSEO
              formData={formData}
              selectedLanguage={selectedLanguage}
              saveMutation={saveMutation}
              handleInputChange={handleInputChange}
              fieldSaveMutation={fieldSaveMutation}
              isTranslating={isTranslating}
              onSave={handleTabSave}
            />
          </TabsContent>

        </Tabs>
      </div>
    </div>);

}

// Walking Season Display Component
function WalkingSeasonDisplay() {
  const { data: settings = [] } = useQuery({
    queryKey: ['globalSettings'],
    queryFn: async () => {
      const { data } = await supabase.from('global_settings').select('*');
      return data || [];
    }
  });

  const bestMonthsSetting = settings.find((s) => s.setting_key === 'best_months');
  const bestMonths = bestMonthsSetting?.setting_value || ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <>
      <div className="grid grid-cols-6 gap-2">
        {monthsList.map((month) => {
          const isActive = bestMonths.includes(month);
          return (
            <Button key={month} disabled className={`w-full font-semibold ${isActive ? 'bg-whi text-white' : 'bg-slate-200 text-slate-600'}`}>
              {month}
            </Button>);

        })}
      </div>
      <p className="text-xs text-slate-700 italic">Walking season applies to all tours. Edit in Global Settings.</p>
    </>);

}

// SEO Preview Component
function SEOPreview({ title, description, slug }) {
  const baseUrl = 'walkingholidayireland.com';
  const truncatedTitle = title ? title.substring(0, 60) + (title.length > 60 ? '...' : '') : 'Tour Title';
  const truncatedDesc = description ? description.substring(0, 155) + (description.length > 155 ? '...' : '') : 'Tour description...';
  const urlPath = slug ? `${baseUrl} › walking-tour › ${slug.substring(0, 30)}...` : `${baseUrl} › tour`;

  return (
    <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
      <p className="text-whi-purple font-medium text-sm mb-1">{truncatedTitle}</p>
      <p className="text-whi text-xs mb-2">{urlPath}</p>
      <p className="text-slate-600 text-sm leading-relaxed">{truncatedDesc}</p>
    </div>);

}

// Editable List Component
function EditableList({ label, items, onChange, onChangeComplete }) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
      onChangeComplete();
    }
  };

  const removeItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange(newItems);
    onChangeComplete();
  };

  const updateItem = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
    onChangeComplete();
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    onChange(newItems);
    onChangeComplete();
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={label}>
          {(provided) =>
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {items.map((item, index) =>
                <Draggable key={index} draggableId={`${label}-${index}`} index={index}>
                  {(provided) =>
                    <div ref={provided.innerRef} {...provided.draggableProps} className="flex items-center gap-2">
                      <div {...provided.dragHandleProps}><GripVertical className="w-4 h-4 text-slate-400" /></div>
                      <Input value={item} onChange={(e) => updateItem(index, e.target.value)} className="flex-1" />
                      <Button size="icon" onClick={() => removeItem(index)} className="bg-red-600 text-white hover:bg-red-700">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  }
                </Draggable>
              )}
              {provided.placeholder}
            </div>
          }
        </Droppable>
      </DragDropContext>

      <div className="flex gap-2">
        <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addItem()} placeholder={`Add ${label.toLowerCase()} item...`} />
        <Button onClick={addItem} className="text-white bg-whi hover:bg-whi-hover">Add</Button>
      </div>
    </div>);

}