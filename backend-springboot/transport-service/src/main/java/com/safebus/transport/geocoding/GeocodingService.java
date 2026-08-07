package com.safebus.transport.geocoding;

import com.safebus.transport.entity.Stop;
import com.safebus.transport.repository.StopRepository;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GeocodingService {
    private final RestTemplate restTemplate;
    private final StopRepository stopRepository;
    private final Map<String, double[]> geocodeCache = new ConcurrentHashMap<>();

    public GeocodingService(RestTemplate restTemplate, StopRepository stopRepository) {
        this.restTemplate = restTemplate;
        this.stopRepository = stopRepository;
    }

    public double[] geocode(String address) {
        if (address == null || address.trim().isEmpty()) {
            return null;
        }

        String addressClean = address.trim();
        if (geocodeCache.containsKey(addressClean)) {
            System.out.println("[Geocoder] Cache hit for address: " + addressClean);
            return geocodeCache.get(addressClean);
        }

        double[] coords = null;

        // 1. Attempt Online Nominatim geocoding (OpenStreetMap)
        try {
            String url = "https://nominatim.openstreetmap.org/search?q=" + addressClean + "&format=json&limit=1";
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "safebus_ai_geocoder_prod");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.GET, entity, List.class);
            List<?> body = response.getBody();
            if (body != null && !body.isEmpty()) {
                Map<?, ?> firstResult = (Map<?, ?>) body.get(0);
                double lat = Double.parseDouble(firstResult.get("lat").toString());
                double lon = Double.parseDouble(firstResult.get("lon").toString());
                coords = new double[]{lat, lon};
            }
        } catch (Exception e) {
            System.err.println("[Geocoder] Online geocoding failed: " + e.getMessage());
        }

        // 2. Offline Fallback Keyword Matching
        if (coords == null) {
            System.out.println("[Geocoder] Online lookup failed for '" + addressClean + "'. Engaging offline matching...");
            coords = offlineFallbackMatch(addressClean);
        }

        if (coords != null) {
            geocodeCache.put(addressClean, coords);
            System.out.println("[Geocoder] Geocoded '" + addressClean + "' to: " + Arrays.toString(coords));
            return coords;
        }

        System.err.println("[Geocoder] Critical: Geocoding failed completely for address: '" + addressClean + "'");
        return null;
    }

    private double[] offlineFallbackMatch(String address) {
        List<String> tokens = new ArrayList<>();
        Matcher m = Pattern.compile("\\w+").matcher(address.toLowerCase());
        while (m.find()) {
            String token = m.group();
            if (token.length() > 2) {
                tokens.add(token);
            }
        }

        if (tokens.isEmpty()) {
            return null;
        }

        List<Stop> stops = stopRepository.findAll();
        Stop bestStop = null;
        int maxMatches = 0;

        for (Stop stop : stops) {
            String stopSearchable = (stop.getName() + " " + (stop.getAddress() != null ? stop.getAddress() : "")).toLowerCase();
            int matchCount = 0;
            for (String token : tokens) {
                if (stopSearchable.contains(token)) {
                    matchCount++;
                }
            }

            if (matchCount > maxMatches) {
                maxMatches = matchCount;
                bestStop = stop;
            }
        }

        if (bestStop != null && maxMatches > 0) {
            System.out.println("[Geocoder-Offline] Match found stop: '" + bestStop.getName() + "' with " + maxMatches + " token overlaps.");
            return new double[]{bestStop.getLatitude(), bestStop.getLongitude()};
        }

        return null;
    }
}
