package com.safebus.student.event;

import com.safebus.student.entity.Student;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class StudentRegistrationEvent extends ApplicationEvent {
    private final Student student;

    public StudentRegistrationEvent(Object source, Student student) {
        super(source);
        this.student = student;
    }
}
