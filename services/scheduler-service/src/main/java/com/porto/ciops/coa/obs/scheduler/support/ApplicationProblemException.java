package com.porto.ciops.coa.obs.scheduler.support;

public class ApplicationProblemException extends RuntimeException {

	public enum Kind {
		INVALID_INPUT,
		RESOURCE_NOT_FOUND,
		STATE_CONFLICT
	}

	private final Kind kind;
	private final String title;

	private ApplicationProblemException(Kind kind, String title, String detail) {
		super(detail);
		this.kind = kind;
		this.title = title;
	}

	public static ApplicationProblemException invalidInput(String title, String detail) {
		return new ApplicationProblemException(Kind.INVALID_INPUT, title, detail);
	}

	public static ApplicationProblemException notFound(String title, String detail) {
		return new ApplicationProblemException(Kind.RESOURCE_NOT_FOUND, title, detail);
	}

	public static ApplicationProblemException conflict(String title, String detail) {
		return new ApplicationProblemException(Kind.STATE_CONFLICT, title, detail);
	}

	public Kind getKind() {
		return kind;
	}

	public String getTitle() {
		return title;
	}
}
