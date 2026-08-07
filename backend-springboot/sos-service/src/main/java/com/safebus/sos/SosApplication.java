package com.safebus.sos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class SosApplication {
    public static void main(String[] args) {
        SpringApplication.run(SosApplication.class, args);
    }
}
