package com.safebus.notification.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration("notificationRabbitConfig")
public class RabbitConfig {

    @Bean
    @ConditionalOnMissingBean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    public static final String ATTENDANCE_QUEUE = "attendance-queue";
    public static final String ATTENDANCE_EXCHANGE = "attendance-exchange";
    public static final String ATTENDANCE_ROUTING_KEY = "attendance.event.*";

    public static final String SOS_QUEUE = "sos-queue";
    public static final String SOS_EXCHANGE = "sos-exchange";
    public static final String SOS_ROUTING_KEY = "sos.event.*";

    @Bean
    public Queue attendanceQueue() {
        return QueueBuilder.durable(ATTENDANCE_QUEUE).build();
    }

    @Bean
    public TopicExchange attendanceExchange() {
        return new TopicExchange(ATTENDANCE_EXCHANGE);
    }

    @Bean
    public Binding attendanceBinding(
            @Qualifier("attendanceQueue") Queue attendanceQueue, 
            @Qualifier("attendanceExchange") TopicExchange attendanceExchange) {
        return BindingBuilder.bind(attendanceQueue).to(attendanceExchange).with(ATTENDANCE_ROUTING_KEY);
    }

    public static final String DRIVER_INCIDENT_QUEUE = "driver-incident-queue";
    public static final String DRIVER_INCIDENT_EXCHANGE = "driver.exchange";
    public static final String DRIVER_INCIDENT_ROUTING_KEY = "driver.alert.#";
    public static final String DRIVER_TELEMETRY_QUEUE = "driver-telemetry-queue";
    public static final String DRIVER_TELEMETRY_ROUTING_KEY = "driver.telemetry";

    @Bean
    public Queue sosQueue() {
        return QueueBuilder.durable(SOS_QUEUE).build();
    }

    @Bean
    public TopicExchange sosExchange() {
        return new TopicExchange(SOS_EXCHANGE);
    }

    @Bean
    public Binding sosBinding(
            @Qualifier("sosQueue") Queue sosQueue, 
            @Qualifier("sosExchange") TopicExchange sosExchange) {
        return BindingBuilder.bind(sosQueue).to(sosExchange).with(SOS_ROUTING_KEY);
    }

    @Bean
    public Queue driverIncidentQueue() {
        return QueueBuilder.durable(DRIVER_INCIDENT_QUEUE).build();
    }

    @Bean
    public TopicExchange driverIncidentExchange() {
        return new TopicExchange(DRIVER_INCIDENT_EXCHANGE);
    }

    @Bean
    public Binding driverIncidentBinding(
            @Qualifier("driverIncidentQueue") Queue driverIncidentQueue, 
            @Qualifier("driverIncidentExchange") TopicExchange driverIncidentExchange) {
        return BindingBuilder.bind(driverIncidentQueue).to(driverIncidentExchange).with(DRIVER_INCIDENT_ROUTING_KEY);
    }

    @Bean
    public Queue driverTelemetryQueue() {
        return QueueBuilder.durable(DRIVER_TELEMETRY_QUEUE).build();
    }

    @Bean
    public Binding driverTelemetryBinding(
            @Qualifier("driverTelemetryQueue") Queue driverTelemetryQueue, 
            @Qualifier("driverIncidentExchange") TopicExchange driverIncidentExchange) {
        return BindingBuilder.bind(driverTelemetryQueue).to(driverIncidentExchange).with(DRIVER_TELEMETRY_ROUTING_KEY);
    }

    public static final String BUS_LOCATION_QUEUE = "bus-location-queue";
    public static final String BUS_LOCATION_ROUTING_KEY = "bus.location.#";

    @Bean
    public Queue busLocationQueue() {
        return QueueBuilder.durable(BUS_LOCATION_QUEUE).build();
    }

    @Bean
    public Binding busLocationBinding(
            @Qualifier("busLocationQueue") Queue busLocationQueue, 
            @Qualifier("driverIncidentExchange") TopicExchange driverIncidentExchange) {
        return BindingBuilder.bind(busLocationQueue).to(driverIncidentExchange).with(BUS_LOCATION_ROUTING_KEY);
    }

    public static final String IDCARD_PROGRESS_QUEUE = "idcard-progress-queue";
    public static final String STUDENT_EXCHANGE = "student-exchange";
    public static final String IDCARD_ROUTING_KEY = "student.event.idcard.#";

    @Bean
    public Queue idcardProgressQueue() {
        return QueueBuilder.durable(IDCARD_PROGRESS_QUEUE).build();
    }

    @Bean
    public TopicExchange studentExchange() {
        return new TopicExchange(STUDENT_EXCHANGE);
    }

    @Bean
    public Binding idcardProgressBinding(
            @Qualifier("idcardProgressQueue") Queue idcardProgressQueue, 
            @Qualifier("studentExchange") TopicExchange studentExchange) {
        return BindingBuilder.bind(idcardProgressQueue).to(studentExchange).with(IDCARD_ROUTING_KEY);
    }
}
